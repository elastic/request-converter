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

/* check()
 * check if the given request(s) can be processed by this exporter
 *
 * arguments:
 *   input: String  A JSONified string with the input arguments with format
 *                  {"requests": ParsedRequest[]}
 * 
 * returns:
 *   a JSON payload with the format {"return": bool} if successful
 *   or {"error": "string"} on a failure
 */
#[wasm_bindgen]
pub fn check(input: String) -> String {
    let Input { requests, options } = serde_json::from_str(input.as_str()).unwrap();

    // this example exporter returns true for all requests
    String::from("{\"return\": true}")
}

/* convert()
 * convert the given request(s) to the target language
 *
 * arguments:
 *   input: String  A JSONified string with the input arguments with format
 *                  {"requests": ParsedRequest[], "options": ConvertOptions}
 * 
 * returns:
 *   a JSON payload with the format {"return": "string"} if successful
 *   or {"error": "string"} on a failure
 */
#[wasm_bindgen]
pub fn convert(input: String) -> String {
    let Input { requests, options } = serde_json::from_str(input.as_str()).unwrap();

    // this example exporter returns a comma-separated list of the API names
    // of the given requests
    let ret = requests.iter().map(|req| req.api.clone().unwrap_or(String::from("?"))).collect::<Vec<_>>();

    String::from(format!("{{\"return\": \"{}\"}}", ret.join(",")))
}
