import { getAxiosReqParams, RequestConfiguration } from '../utils/cancelRequests';
import { Quota, TPDICollections, TPDProvider, TPDISearchParams, TPDI_SERVICE_URL } from './const';
import { AirbusDataProvider } from './AirbusDataProvider';
import { PlanetDataProvider } from './PlanetDataProvider';
import { MaxarDataProvider } from './MaxarDataProvider';
import { TPDProviderInterface } from './TPDProvider';
import { ensureTimeout } from '../utils/ensureTimeout';
import { getAuthToken } from '../auth';
import axios, { AxiosRequestConfig } from 'axios';
import { CACHE_CONFIG_NOCACHE } from '../utils/cacheHandlers';

const dataProviders = [new AirbusDataProvider(), new PlanetDataProvider(), new MaxarDataProvider()];

function getThirdPartyDataProvider(provider: TPDProvider): TPDProviderInterface {
  const tpdp = dataProviders.find(p => p.getProvider() === provider);
  if (!tpdp) {
    throw new Error(`Unknown data provider ${provider}`);
  }
  return tpdp;
}

async function getQuotasInner(
  TDPICollectionId?: TPDICollections,
  reqConfig?: RequestConfiguration,
): Promise<any> {
  return await ensureTimeout(async innerReqConfig => {
    const requestConfig: AxiosRequestConfig = createRequestConfig(innerReqConfig);
    if (!!TDPICollectionId) {
      requestConfig.params = { collectionId: TDPICollectionId };
    }
    const res = await axios.get(`${TPDI_SERVICE_URL}/quotas`, requestConfig);
    return res.data;
  }, reqConfig);
}

function createRequestConfig(innerReqConfig: RequestConfiguration): AxiosRequestConfig {
  const authToken = innerReqConfig && innerReqConfig.authToken ? innerReqConfig.authToken : getAuthToken();
  if (!authToken) {
    throw new Error('Must be authenticated to perform request');
  }
  const headers = {
    Authorization: `Bearer ${authToken}`,
  };

  const requestConfig: AxiosRequestConfig = {
    responseType: 'json',
    headers: headers,
    ...getAxiosReqParams(innerReqConfig, CACHE_CONFIG_NOCACHE),
  };
  return requestConfig;
}

export class TPDI {
  public static async getQuota(
    TDPICollectionId: TPDICollections,
    reqConfig?: RequestConfiguration,
  ): Promise<Quota> {
    if (!TDPICollectionId) {
      throw new Error('TDPICollectionId must be provided');
    }
    return await getQuotasInner(TDPICollectionId, reqConfig);
  }

  public static async getQuotas(reqConfig?: RequestConfiguration): Promise<Quota> {
    return await getQuotasInner(null, reqConfig);
  }

  public static async search(
    provider: TPDProvider,
    params: TPDISearchParams,
    reqConfig?: RequestConfiguration,
    count: number = 10,
    viewtoken: string = null,
  ): Promise<TPDSearchResult> {
    return await ensureTimeout(async innerReqConfig => {
      const requestConfig: AxiosRequestConfig = createRequestConfig(innerReqConfig);
      const tpdp = getThirdPartyDataProvider(provider);
      tpdp.addSearchPagination(requestConfig, count, viewtoken);
      const payload = tpdp.getSearchPayload(params);
      const response = await axios.post<TPDSearchResult>(
        `${TPDI_SERVICE_URL}/search`,
        payload,
        requestConfig,
      );
      return response.data;
    }, reqConfig);
  }

  public static async getThumbnail(
    collectionId: TPDICollections,
    productId: string,
    reqConfig?: RequestConfiguration,
  ): Promise<Blob> {
    if (!collectionId) {
      throw new Error('collectionId must be provided');
    }

    if (!productId) {
      throw new Error('productId must be provided');
    }

    return await ensureTimeout(async innerReqConfig => {
      const requestConfig: AxiosRequestConfig = createRequestConfig(innerReqConfig);
      requestConfig.responseType = 'blob';

      const response = await axios.get<Blob>(
        `${TPDI_SERVICE_URL}/collections/${collectionId}/products/${productId}/thumbnail`,
        requestConfig,
      );
      const thumbnail = response.data;
      return thumbnail;
    }, reqConfig);
  }

  public static async createOrder(
    provider: TPDProvider,
    name: string,
    collectionId: string,
    items: string[],
    params: TPDISearchParams,
    reqConfig?: RequestConfiguration,
  ): Promise<any> {
    return await ensureTimeout(async innerReqConfig => {
      const requestConfig: AxiosRequestConfig = createRequestConfig(innerReqConfig);
      const tpdp = getThirdPartyDataProvider(provider);
      const payload = tpdp.getOrderPayload(name, collectionId, items, params);
      return await axios.post(`${TPDI_SERVICE_URL}/order`, payload, requestConfig);
    }, reqConfig);
  }
}
