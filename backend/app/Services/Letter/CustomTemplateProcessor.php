<?php

namespace App\Services\Letter;

use PhpOffice\PhpWord\TemplateProcessor;

class CustomTemplateProcessor extends TemplateProcessor
{
    /**
     * Override save() to convert legacy VML <w:pict> into modern OOXML DrawingML <w:drawing>
     * and ensure shapetype fallback is present.
     */
    public function save(): string
    {
        $this->tempDocumentMainPart = $this->convertVmlToDrawingML($this->tempDocumentMainPart);

        foreach ($this->tempDocumentHeaders as $index => &$xml) {
            $xml = $this->convertVmlToDrawingML($xml);
        }
        unset($xml);

        foreach ($this->tempDocumentFooters as $index => &$xml) {
            $xml = $this->convertVmlToDrawingML($xml);
        }
        unset($xml);

        return parent::save();
    }

    /**
     * Convert PHPWord's VML <w:pict> image representations into OpenXML DrawingML <w:drawing>.
     */
    public function convertVmlToDrawingML(?string $xml): ?string
    {
        if (empty($xml) || !str_contains($xml, '<w:pict>')) {
            return $xml;
        }

        // Find existing docPr id numbers to avoid collisions
        preg_match_all('/\bid="(\d+)"/i', $xml, $idMatches);
        $nextId = !empty($idMatches[1]) ? max(array_map('intval', $idMatches[1])) + 1 : 1000;

        // Match PHPWord VML image tags:
        // <w:pict><v:shape ... style="..." ...><v:imagedata r:id="..." .../></v:shape></w:pict>
        $pattern = '/<w:pict>\s*<v:shape\b[^>]*?\bstyle=["\']([^"\']*)["\'][^>]*>\s*<v:imagedata\b[^>]*?\br:id=["\']([^"\']+)["\'][^>]*\/?>\s*<\/v:shape>\s*<\/w:pict>/is';

        $xml = preg_replace_callback($pattern, function ($matches) use (&$nextId) {
            $style = $matches[1] ?? '';
            $rId   = $matches[2] ?? '';

            // Extract width & height
            $widthVal   = 400.0;
            $widthUnit  = 'px';
            if (preg_match('/width\s*:\s*([\d\.]+)\s*(px|pt|in|cm)?/i', $style, $m)) {
                $widthVal  = (float) $m[1];
                $widthUnit = strtolower($m[2] ?? 'px');
            }

            $heightVal  = 260.0;
            $heightUnit = 'px';
            if (preg_match('/height\s*:\s*([\d\.]+)\s*(px|pt|in|cm)?/i', $style, $m)) {
                $heightVal  = (float) $m[1];
                $heightUnit = strtolower($m[2] ?? 'px');
            }

            $toEmu = function (float $val, string $unit): int {
                return match ($unit) {
                    'pt'    => (int) round($val * 12700),
                    'in'    => (int) round($val * 914400),
                    'cm'    => (int) round($val * 360000),
                    default => (int) round($val * 9525), // px or default 96dpi
                };
            };

            $cx = $toEmu($widthVal, $widthUnit);
            $cy = $toEmu($heightVal, $heightUnit);
            $docId = $nextId++;

            return '<w:drawing>' .
                '<wp:inline distT="0" distB="0" distL="0" distR="0">' .
                    '<wp:extent cx="' . $cx . '" cy="' . $cy . '"/>' .
                    '<wp:effectExtent l="0" t="0" r="0" b="0"/>' .
                    '<wp:docPr id="' . $docId . '" name="Picture ' . $docId . '"/>' .
                    '<wp:cNvGraphicFramePr>' .
                        '<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>' .
                    '</wp:cNvGraphicFramePr>' .
                    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' .
                        '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' .
                            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' .
                                '<pic:nvPicPr>' .
                                    '<pic:cNvPr id="' . $docId . '" name="Picture ' . $docId . '"/>' .
                                    '<pic:cNvPicPr/>' .
                                '</pic:nvPicPr>' .
                                '<pic:blipFill>' .
                                    '<a:blip r:embed="' . htmlspecialchars($rId, ENT_QUOTES, 'UTF-8') . '"/>' .
                                    '<a:stretch><a:fillRect/></a:stretch>' .
                                '</pic:blipFill>' .
                                '<pic:spPr>' .
                                    '<a:xfrm>' .
                                        '<a:off x="0" y="0"/>' .
                                        '<a:ext cx="' . $cx . '" cy="' . $cy . '"/>' .
                                    '</a:xfrm>' .
                                    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' .
                                '</pic:spPr>' .
                            '</pic:pic>' .
                        '</a:graphicData>' .
                    '</a:graphic>' .
                '</wp:inline>' .
            '</w:drawing>';
        }, $xml);

        // Ensure drawingml namespaces are defined on <w:document>
        if (str_contains($xml, '<w:document')) {
            $requiredNamespaces = [
                'xmlns:wp'  => 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
                'xmlns:a'   => 'http://schemas.openxmlformats.org/drawingml/2006/main',
                'xmlns:pic' => 'http://schemas.openxmlformats.org/drawingml/2006/picture',
                'xmlns:r'   => 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
            ];

            $xml = preg_replace_callback('/<w:document\b([^>]*)>/i', function ($docMatch) use ($requiredNamespaces) {
                $attrs = $docMatch[1];
                $toAdd = '';
                foreach ($requiredNamespaces as $nsKey => $nsUri) {
                    if (!str_contains($attrs, $nsKey . '=')) {
                        $toAdd .= ' ' . $nsKey . '="' . $nsUri . '"';
                    }
                }
                return '<w:document' . $attrs . $toAdd . '>';
            }, $xml, 1);
        }

        // Fallback: If any legacy <v:shape remains, ensure <v:shapetype id="_x0000_t75"> exists
        if (str_contains($xml, '<v:shape') && !str_contains($xml, 'id="_x0000_t75"')) {
            $shapetype = '<v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f">' .
                '<v:stroke joinstyle="miter"/>' .
                '<v:formulas>' .
                    '<v:f eqn="if lineDrawn pixelLineWidth 0"/>' .
                    '<v:f eqn="sum @0 1 0"/>' .
                    '<v:f eqn="sum 0 0 @1"/>' .
                    '<v:f eqn="prod @2 1 2"/>' .
                    '<v:f eqn="prod @3 21600 pixelWidth"/>' .
                    '<v:f eqn="prod @3 21600 pixelHeight"/>' .
                    '<v:f eqn="sum @0 0 1"/>' .
                    '<v:f eqn="prod @6 1 2"/>' .
                    '<v:f eqn="prod @7 21600 pixelWidth"/>' .
                    '<v:f eqn="sum @8 21600 0"/>' .
                    '<v:f eqn="prod @7 21600 pixelHeight"/>' .
                    '<v:f eqn="sum @10 21600 0"/>' .
                '</v:formulas>' .
                '<v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/>' .
                '<o:lock v:ext="edit" aspectratio="t"/>' .
            '</v:shapetype>';

            if (str_contains($xml, '<w:body>')) {
                $xml = preg_replace('/<w:body>/i', '<w:body>' . $shapetype, $xml, 1);
            }
        }

        return $xml;
    }
}
