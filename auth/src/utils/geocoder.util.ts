import NodeGeocoder from 'node-geocoder';

interface IOptions{
    provider: any,
    apiKey: any,
    formatter: any
}

const options: IOptions = {
    provider:  process.env.GEOCODER_PROVIDER,
    apiKey:  process.env.GOOGLE_MAP_APIKEY, // for Mapquest, OpenCage, Google Premier
    formatter: null // 'gpx', 'string', ...
  };

  const geocoder = NodeGeocoder(options);

export default geocoder;