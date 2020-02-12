import { DATASET_EOCLOUD_LANDSAT7 } from 'src/layer/dataset';
import { AbstractSentinelHubV1OrV2WithCCLayer } from 'src/layer/AbstractSentinelHubV1OrV2WithCCLayer';

export class Landsat7EOCloudLayer extends AbstractSentinelHubV1OrV2WithCCLayer {
  public readonly dataset = DATASET_EOCLOUD_LANDSAT7;
}
