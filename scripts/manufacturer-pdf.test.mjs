import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimensionInMm, manufacturerPdfRasterSize, manufacturerPdfFilename, exportManufacturerPdf } from '../assets/manufacturer-pdf.mjs';

test('PDF page dimensions preserve explicit physical units', () => {
  assert.equal(dimensionInMm('594mm'), 594);
  assert.equal(dimensionInMm('42cm'), 420);
  assert.equal(dimensionInMm('1in'), 25.4);
  assert.equal(dimensionInMm('72pt'), 25.4);
  assert.equal(dimensionInMm('96px'), 25.4);
  assert.equal(dimensionInMm('96'), 25.4);
  assert.equal(dimensionInMm('.5mm'), 0.5);
});

test('PDF refuses missing, relative, non-positive and oversized physical pages', () => {
  for (const value of ['', null, undefined, '0mm', '-2mm', '100%', 'NaN', 'Infinity', '5001mm', 'calc(1mm)']) {
    assert.throws(() => dimensionInMm(value), /page|drawing/);
  }
  for (const dimensions of [[0, 420], [-1, 420], [594, Infinity], [NaN, 420], [5001, 420]]) assert.throws(() => manufacturerPdfRasterSize(...dimensions));
});

test('normal A2 sheet rasterizes at 300 dpi without cropping or page scaling', () => {
  const size = manufacturerPdfRasterSize(594, 420);
  assert.equal(size.widthMm, 594);
  assert.equal(size.heightMm, 420);
  assert.equal(size.widthPx, 7015);
  assert.equal(size.heightPx, 4960);
  assert(size.dpi > 299 && size.dpi <= 300);
});

test('large single sheets retain physical dimensions while bounding canvas memory', () => {
  for (const dimensions of [[1188, 1680], [5000, 100], [100, 5000], [5000, 5000], [.1, .1]]) {
    const size = manufacturerPdfRasterSize(...dimensions);
    assert.equal(size.widthMm, dimensions[0]);
    assert.equal(size.heightMm, dimensions[1]);
    assert(size.widthPx * size.heightPx <= 36_000_000);
    assert(size.widthPx <= 16_384 && size.heightPx <= 16_384);
    assert(size.widthPx >= 1 && size.heightPx >= 1);
  }
});

test('filenames preserve Thai and cannot introduce paths or duplicate extensions', () => {
  assert.equal(manufacturerPdfFilename('โครงการ ก-manufacturer.pdf'), 'โครงการ ก-manufacturer.pdf');
  assert.equal(manufacturerPdfFilename('one.PDF'), 'one.pdf');
  assert.equal(manufacturerPdfFilename('a/b:c?d.pdf'), 'a-b-c-d.pdf');
  assert.equal(manufacturerPdfFilename(''), 'manufacturer-drawing.pdf');
});

test('exporter reports unsupported environments instead of producing an empty PDF', async () => {
  await assert.rejects(exportManufacturerPdf('<svg/>'), /browser/);
});
