mod utils;

use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use serde::Deserialize;

#[derive(Deserialize)]
struct ParsedRequest {
    api: Option<String>,
    body: Option<HashMap<String, serde_json::Value>>,
    method: String,
    params: HashMap<String, Option<String>>,
    path: String,
    query: Option<HashMap<String, String>>,
    raw_path: Option<String>,
    request: Option<HashMap<String, serde_json::Value>>,
    source: String,
    url: String,
}

#[derive(Deserialize)]
struct ConvertOptions {
  check_only: Option<bool>,
  complete: Option<bool>,
  print_response: Option<bool>,
  elasticsearch_url: Option<String>,
  debug: Option<bool>,
}

#[derive(Deserialize)]
struct Input {
    requests: Vec<ParsedRequest>,
    options: Option<ConvertOptions>,
}

/* check - return a boolean indicating if a conversion of the request(s) is supported */
#[wasm_bindgen]
pub fn check(input: String) -> String {
    let Input { requests, options } = serde_json::from_str(input.as_str()).unwrap();

    // this simplistic exporter returns true for all requests
    String::from("{\"return\": true}")
}

/* convert - generate code for the given requests and options */
#[wasm_bindgen]
pub fn convert(input: String) -> String {
    let Input { requests, options } = serde_json::from_str(input.as_str()).unwrap();

    // this simplistic exporter just returns a comma-separated list of the API names
    // of the given requests
    let ret = requests.iter().map(|req| req.api.clone().unwrap_or(String::from("?"))).collect::<Vec<_>>();

    String::from(format!("{{\"return\": \"{}\"}}", ret.join(",")))
}
