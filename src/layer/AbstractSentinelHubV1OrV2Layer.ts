import axios from 'axios';
import { stringify } from 'query-string';
import moment, { Moment } from 'moment';

import { BBox } from 'src/bbox';
import { GetMapParams, ApiType, PaginatedTiles } from 'src/layer/const';
import { wmsGetMapUrl } from 'src/layer/wms';
import { AbstractLayer } from 'src/layer/AbstractLayer';

// this class provides any SHv1- or SHv2-specific (EO Cloud) functionality to the subclasses:
export class AbstractSentinelHubV1OrV2Layer extends AbstractLayer {
  protected instanceId: string;
  protected layerId: string;
  protected evalscript: string | null;
  protected evalscriptUrl: string | null;

  public constructor(
    instanceId: string,
    layerId: string,
    evalscript: string | null = null,
    evalscriptUrl: string | null = null,
    title: string | null = null,
    description: string | null = null,
  ) {
    super(title, description);
    if (!layerId || !instanceId) {
      throw new Error('Parameters instanceId and layerId must be specified!');
    }
    this.instanceId = instanceId;
    this.layerId = layerId;
    this.evalscript = evalscript;
    this.evalscriptUrl = evalscriptUrl;
  }

  protected getEvalsource(): string {
    // some subclasses (Sentinel 1 at EO Cloud) might want to return a different
    // evalsource depending on their parameters
    return this.dataset.shWmsEvalsource;
  }

  protected getWmsGetMapUrlAdditionalParameters(): Record<string, any> {
    return {};
  }

  public getMapUrl(params: GetMapParams, api: ApiType): string {
    if (api !== ApiType.WMS) {
      throw new Error('Only WMS is supported on this layer');
    }
    const baseUrl = `${this.dataset.shServiceHostname}v1/wms/${this.instanceId}`;
    return wmsGetMapUrl(
      baseUrl,
      this.layerId,
      params,
      this.evalscript,
      this.evalscriptUrl,
      this.getEvalsource(),
      this.getWmsGetMapUrlAdditionalParameters(),
    );
  }

  protected getFindTilesAdditionalParameters(): Record<string, any> {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected extractFindTilesMeta(tile: any): Record<string, any> {
    return {};
  }

  public async findTiles(
    bbox: BBox,
    fromTime: Moment,
    toTime: Moment,
    maxCount: number = 50,
    offset: number = 0,
  ): Promise<PaginatedTiles> {
    if (!this.dataset.searchIndexUrl) {
      throw new Error('This dataset does not support searching for tiles');
    }
    const payload = bbox.toGeoJSON();
    const params = {
      expand: 'true',
      timefrom: fromTime.toISOString(),
      timeto: toTime.toISOString(),
      maxcount: maxCount,
      offset: Number(offset),
      ...this.getFindTilesAdditionalParameters(),
    };

    const url = `${this.dataset.searchIndexUrl}?${stringify(params, { sort: false })}`;
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept-CRS': 'EPSG:4326',
      },
    });

    const responseTiles: any[] = response.data.tiles;
    return {
      tiles: responseTiles.map(tile => ({
        geometry: tile.tileDrawRegionGeometry,
        sensingTime: moment.utc(tile.sensingTime),
        meta: this.extractFindTilesMeta(tile),
      })),
      hasMore: response.data.hasMore,
    };
  }

  protected getFindDatesAdditionalParameters(): Record<string, any> {
    return {};
  }

  public async findDates(bbox: BBox, fromTime: Moment, toTime: Moment): Promise<Moment[]> {
    if (!this.dataset.findDatesUrl) {
      throw new Error('This dataset does not support searching for dates');
    }

    const payload = bbox.toGeoJSON();
    const params = {
      timefrom: fromTime.toISOString(),
      timeto: toTime.toISOString(),
      ...this.getFindDatesAdditionalParameters(),
    };

    const url = `${this.dataset.findDatesUrl}?${stringify(params, { sort: false })}`;
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept-CRS': 'EPSG:4326',
      },
    });

    return response.data.map((d: string) => moment.utc(d));
  }
}
