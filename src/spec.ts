export interface UrlTemplate {
  path: string;
  methods: string[];
}

export interface Endpoint {
  name: string;
  urls: UrlTemplate[];
}

export interface Model {
  _info?: {
    title: string;
    license: {
      name: string;
      url: string;
    };
  };

  endpoints: Endpoint[];
}
