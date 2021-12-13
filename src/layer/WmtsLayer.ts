import axios, { AxiosRequestConfig } from 'axios';

import { GetMapParams, ApiType } from './const';
import { AbstractLayer } from './AbstractLayer';
import { RequestConfiguration } from '../utils/cancelRequests';
import { ensureTimeout } from '../utils/ensureTimeout';
import { CACHE_CONFIG_30MIN } from '../utils/cacheHandlers';
import { getAxiosReqParams } from '../utils/cancelRequests';
import { bboxToXyz, fetchLayersFromWmtsGetCapabilitiesXml } from './wmts.utils';
import { Effects } from '..';
import { runEffectFunctions } from '../mapDataManipulation/runEffectFunctions';

interface ConstructorParameters {
  baseUrl?: string;
  layerId?: string;
  title?: string | null;
  description?: string | null;
  legendUrl?: string | null;
  resourceUrl?: string | null;
}

export class WmtsLayer extends AbstractLayer {
  protected baseUrl: string;
  protected layerId: string;
  protected resourceUrl: string;

  public constructor({
    baseUrl,
    layerId,
    title = null,
    description = null,
    legendUrl = null,
    resourceUrl = null,
  }: ConstructorParameters) {
    super({ title, description, legendUrl });
    this.baseUrl = baseUrl;
    this.layerId = layerId;
    this.resourceUrl = resourceUrl;
  }

  public async updateLayerFromServiceIfNeeded(reqConfig?: RequestConfiguration): Promise<void> {
    await ensureTimeout(async innerReqConfig => {
      if (!this.resourceUrl) {
        const parsedLayers = await fetchLayersFromWmtsGetCapabilitiesXml(this.baseUrl, innerReqConfig);
        const layer = parsedLayers.find(layerInfo => this.layerId === layerInfo.Name[0]);
        this.resourceUrl = layer.ResourceUrl;
      }
    }, reqConfig);
  }

  public async getMap(params: GetMapParams, api: ApiType, reqConfig?: RequestConfiguration): Promise<Blob> {
    return await ensureTimeout(async innerReqConfig => {
      await this.updateLayerFromServiceIfNeeded(reqConfig);
      const paramsWithoutEffects = { ...params };
      delete paramsWithoutEffects.gain;
      delete paramsWithoutEffects.gamma;
      delete paramsWithoutEffects.effects;
      const url = this.getMapUrl(paramsWithoutEffects, api);

      const requestConfig: AxiosRequestConfig = {
        // 'blob' responseType does not work with Node.js:
        responseType: typeof window !== 'undefined' && window.Blob ? 'blob' : 'arraybuffer',
        ...getAxiosReqParams(innerReqConfig, CACHE_CONFIG_30MIN),
      };
      const response = await axios.get(url, requestConfig);
      let blob = response.data;

      // apply effects:
      // support deprecated GetMapParams.gain and .gamma parameters
      // but override them if they are also present in .effects
      const effects: Effects = { gain: params.gain, gamma: params.gamma, ...params.effects };
      blob = await runEffectFunctions(blob, effects);
      return blob;
    });
  }

  public getMapUrl(params: GetMapParams, api: ApiType): string {
    if (api !== ApiType.WMTS) {
      throw new Error('Only WMTS is supported on this layer');
    }

    if (!params.bbox && !params.tileCoord) {
      throw new Error('No bbox or x,y coordinates provided');
    }
    if (!this.resourceUrl) {
      throw new Error('No resource URL provided');
    }
    if (params.gain) {
      throw new Error('Parameter gain is not supported in getMapUrl. Use getMap method instead.');
    }
    if (params.gamma) {
      throw new Error('Parameter gamma is not supported in getMapUrl. Use getMap method instead.');
    }
    if (params.effects) {
      throw new Error('Parameter effects is not supported in getMapUrl. Use getMap method instead.');
    }
    const xyz =
      params.bbox && !params.tileCoord
        ? bboxToXyz(params.bbox, params.width)
        : {
            x: params.tileCoord.x,
            y: params.tileCoord.y,
            z: params.tileCoord.z,
          };
    const urlParams: Record<string, any> = {
      '{TileMatrix}': xyz.z,
      '{TileCol}': xyz.x,
      '{TileRow}': xyz.y,
    };

    return this.resourceUrl.replace(/\{ *([\w_ -]+) *\}/g, (m: string) => urlParams[m]);
  }

  public supportsApiType(api: ApiType): boolean {
    return api === ApiType.WMTS;
  }
}
