import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { DATASET_S2L2A, DATASET_S5PL2 } from '../dataset';
import { LayersFactory } from '../LayersFactory';
import { WmsLayer, setAuthToken } from '../../index';
import { S2L1CLayer } from '../S2L1CLayer';
import { S5PL2Layer } from '../S5PL2Layer';
import { getCapabilitiesWmsXmlResponse } from './fixtures.getCapabilitiesWMS';
import { getCapabilitiesWmtsXMLResponse } from './fixtures.getCapabilitiesWMTS';
import { WmtsLayer } from '../WmtsLayer';

const mockNetwork = new MockAdapter(axios);

const cases = [
  {
    url: `${DATASET_S2L2A.shServiceHostname}ogc/wms/instanceID`,
    response: {
      layers: [
        {
          id: 'S2L1C',
          name: 's2l1c',
          description: '',
          dataset: 'S2L1C',
          legendUrl: '',
        },
      ],
    },
    expectedInstanceType: S2L1CLayer,
  },

  {
    url: `${DATASET_S5PL2.shServiceHostname}ogc/wms/`,
    response: {
      layers: [
        {
          dataset: 'S5PL2',
          description: '',
          id: 'S5TMP',
          name: 's5tmp',
        },
      ],
    },
    expectedInstanceType: S5PL2Layer,
  },

  {
    url: 'https://proba-v-mep.esa.int/applications/geo-viewer/app/geoserver/ows',
    response: getCapabilitiesWmsXmlResponse,
    expectedInstanceType: WmsLayer,
  },
  {
    url: 'https://api.planet.com/basemaps/v1/mosaics/wmts',
    response: getCapabilitiesWmtsXMLResponse,
    expectedInstanceType: WmtsLayer,
  },
];

describe('Test LayersFactory', () => {
  test.each(cases)(
    'Given url returns correct Layer type',
    async ({ url, response, expectedInstanceType }) => {
      setAuthToken('a123');
      mockNetwork.reset();
      mockNetwork.onAny().replyOnce(200, response); // we don't care about the response, we will just inspect the request params
      const layer = (await LayersFactory.makeLayers(url, null))[0];

      expect(layer).toBeInstanceOf(expectedInstanceType);
    },
  );
});