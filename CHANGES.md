# request-converter change log

## 9.0.3 (2025-11-13)
* Fix escaping of single quotes in ndjson payloads in the curl exporter

## 9.0.2 (2025-11-12)
* Write correctly formatted ndjson bodies in the curl exporter ([#99](https://github.com/elastic/request-converter/pull/99))

## 9.0.1 (2025-04-04)
* Updated schema for 9.0

## 9.0.0 (2025-02-24)
* Update schema for 9.0

## 8.18.0 (2025-02-24)
* Support for externally hosted exporters ([#69](https://github.com/elastic/request-converter/pull/69))
* Update schema for 8.18

## 8.17.0 (2024-12-04)
* Parse {placeholders} in request URLs ([#64](https://github.com/elastic/request-converter/pull/64))
* Support trailing commas in requests ([#74](https://github.com/elastic/request-converter/pull/74))
* Support Kibana URLs in the curl exporter (Fixes #71) ([#72](https://github.com/elastic/request-converter/pull/72))
* Include source in parsed request ([#67](https://github.com/elastic/request-converter/pull/67))
* Separate initialize functions per language ([#76](https://github.com/elastic/request-converter/pull/76))
* Update schema for 8.17

## 8.16.0 (2024-10-14)
* Update schema for 8.16

## 8.15.4 (2024-08-26)
* Add support for the Connector API

## 8.15.3 (2024-08-13)
* Downgrade prettier to avoid dynamic imports ([#58](https://github.com/elastic/request-converter/pull/58))

## 8.15.2 (2024-08-07)
* Export the `listFormats()` function ([#47](https://github.com/elastic/request-converter/pull/47))
* Friendly error when invalid export format is requested ([#48](https://github.com/elastic/request-converter/pull/48))
* Treat bodies as of type 'value' when not described in schema ([#49](https://github.com/elastic/request-converter/pull/49))
* Ensure undefined bodies are encoded as null ([#53](https://github.com/elastic/request-converter/pull/53))

## 8.15.1 (2024-08-02)
* JavaScript support ([#44](https://github.com/elastic/request-converter/pull/44))

## 8.15.0 (2024-07-08)
* Update the 8.15 schema ([#32](https://github.com/elastic/request-converter/pull/32))

## 8.14.3 (2024-07-05)
* Better handling of boolean arguments in query string for Python ([#16](https://github.com/elastic/request-converter/pull/16))

## 8.14.2 (2024-06-21)

* Updated schema to latest version

## 8.14.1 (2024-06-21)

* Various fixes and improvements

## 8.14.0 (2024-06-11)

* Initial release







