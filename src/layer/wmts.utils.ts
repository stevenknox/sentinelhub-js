import { RequestConfiguration } from '..';
import { BBox } from '../bbox';
import { CRS_EPSG3857, CRS_EPSG4326 } from '../crs';
import { OgcServiceTypes } from './const';
import { fetchGetCapabilitiesXml, GetCapabilitiesXmlLayer } from './utils';

const DEGREE_TO_RADIAN = Math.PI / 180;
const RADIAN_TO_DEGREE = 180 / Math.PI;
const EQUATOR_RADIUS = 6378137.0;

export type GetCapabilitiesWmtsXml = {
  Capabilities: {
    'ows:ServiceIdentification': any[][];
    'ows:ServiceProvider': any[][];
    'ows:OperationsMetadata': any[][];
    Contents: [{ Layer: GetCapabilitiesXmlWmtsLayer[] }];
    ServiceMetadataURL: any[][];
  };
};

export type GetCapabilitiesXmlWmtsLayer = {
  'ows:Title': string;
  'ows:Abstract': string;
  'ows:WGS84BoundingBox': {}[][];
  'ows:Identifier': string[];
  Style: any[];
  Format: string[];
  TileMatrixSetLink: any[];
  ResourceURL: any[];
};

function toWgs84(xy: number[]): number[] {
  return [
    (xy[0] * RADIAN_TO_DEGREE) / EQUATOR_RADIUS,
    (Math.PI * 0.5 - 2.0 * Math.atan(Math.exp(-xy[1] / EQUATOR_RADIUS))) * RADIAN_TO_DEGREE,
  ];
}

export function bboxToXyz(bbox: BBox, zoom: number, tileSize: number): { x: number; y: number; z: number } {
  if (bbox.crs === CRS_EPSG3857) {
    const topLeft = toWgs84([bbox.minX, bbox.minY]);
    const bottomRight = toWgs84([bbox.maxX, bbox.maxY]);
    bbox = new BBox(CRS_EPSG4326, topLeft[0], topLeft[1], bottomRight[0], bottomRight[1]);
  }
  const topLeft = [bbox.minX, bbox.maxY];
  const { pixelX, pixelY } = toPixel(topLeft, tileSize, zoom);
  const tileX = Math.floor(pixelX / tileSize);
  const tileY = Math.floor(pixelY / tileSize);
  return { x: tileX, y: tileY, z: zoom };
}

export function toPixel(coord: number[], tileSize: number, zoom: number): { pixelX: number; pixelY: number } {
  const [longitude, latitude] = coord;
  const mapWidth = tileSize * Math.pow(2, zoom);
  const sinLatitude = Math.min(Math.max(Math.sin(DEGREE_TO_RADIAN * latitude), -0.9999), 0.9999);
  const pixelX = Math.round(((longitude + 180) / 360) * mapWidth);
  const pixelY = Math.round(
    (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * mapWidth,
  );
  return { pixelX, pixelY };
}

function parseXmlWmtsLayers(parsedXml: GetCapabilitiesWmtsXml): GetCapabilitiesXmlLayer[] {
  return parsedXml.Capabilities.Contents[0].Layer.map(l => {
    return {
      Name: l['ows:Identifier'],
      Title: [l['ows:Title']],
      Abstract: [l['ows:Abstract']],
      Style: l.Style,
      ResourceUrl: getResourceUrl(l),
    };
  });
}
export async function fetchLayersFromWmtsGetCapabilitiesXml(
  baseUrl: string,
  reqConfig: RequestConfiguration,
): Promise<GetCapabilitiesXmlLayer[]> {
  const parsedXml = ((await fetchGetCapabilitiesXml(
    baseUrl,
    OgcServiceTypes.WMTS,
    reqConfig,
  )) as unknown) as GetCapabilitiesWmtsXml;
  const layers = parseXmlWmtsLayers(parsedXml);
  return layers;
}

export function getResourceUrl(xmlLayer: GetCapabilitiesXmlWmtsLayer): string | null {
  if (xmlLayer.ResourceURL[0] && xmlLayer.ResourceURL[0].$) {
    const resource = xmlLayer.ResourceURL[0].$;
    if (resource.resourceType === 'tile') {
      return resource.template;
    }
  }
  return null;
}
