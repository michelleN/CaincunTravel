use anyhow::Result;
use std::str;
use uuid::Uuid;
use spin_sdk::{
    http::{send, IntoResponse, Method, Params, Request, RequestBuilder, Response, ResponseBuilder, Router},
    key_value::Store
};
use spin_sdk::http_component;

#[http_component]
fn handle_request(req: Request) -> Result<impl IntoResponse> {
    let mut router = Router::default();
    router.get_async("/", route_by_cookie);
    Ok(router.handle(req))
}

fn has_desired_cookie(req: &Request) -> Option<String> {
    match req.header("cookie") {
        Some(header) => match header.as_str() {
            Some(header_value) => {
                if header_value.contains("caincun-travel=yes") {
                    Some(header_value.to_string())
                } 
                else {
                    None
                }
            },
            None => None,
        },
        None => None,
    }
}

async fn route_by_cookie(req: Request, _: Params) -> Result<impl IntoResponse> {
    // Open the default key-value store
    let store = Store::open_default()?;

    println!("has_desired_cookie = {:?}", has_desired_cookie(&req).or(Some("cookie not found".to_string())));
    let uuid: String =  match has_desired_cookie(&req) {
        Some(cookie_header) => {
            cookie_header
            .split(';')
            .find_map(|cookie_chunk| {
                if cookie_chunk.contains("uuid") {
                    let mut parts = cookie_chunk.trim().split("=");
                    parts.next(); // 'uuid'
                    match parts.next() {
                        Some(uuid) => Some(uuid.to_string()),
                        None => Some(Uuid::new_v4().to_string())
                    }
                } else {
                    None
                }
            }).unwrap_or(Uuid::new_v4().to_string())
        },
        None => {
            Uuid::new_v4().to_string()
        }
    };

    // Is the uuid in the store?
    println!("store keys: {:?}", store.get_keys());
    match store.get(&uuid) {
        Ok(val) => match val {
            Some(val) => {
                // somehow analyze value, set to some new state?
                println!("value corresponding to session uuid {} is {:?}", &uuid, str::from_utf8(&val).unwrap_or("NONE"));
            },
            None => {
                // store it with "in-prog" or something
                println!("no value corresponding with session uuid {} in store", &uuid);
                store.set(&uuid, "TBD-start-of-game".as_bytes())?;
            }
        },
        Err(e) => {
            // TODO: error on get; what to do?
            println!("error getting uuid {} from store: {}", &uuid, e);
        }
    }

    // Self/local paths don't work in FWF ?
    let engine_route = "http://localhost:3000/site";
    let mut engine_req = RequestBuilder::new(Method::Get, engine_route).build();
    // TODO: hand the entire cookie as-is to the engine?  Or just the session?
    engine_req.set_header("session-uuid", &uuid);
    let engine_response: Response = send(engine_req).await?;

    Ok(ResponseBuilder::new(200)
        .header("content-type", "text/html")
        .header(
            "set-cookie",
            format!("caincun-travel=yes;Path=/;SameSite=Lax;Max-Age=3600;uuid={}", uuid),
        )
        .body(engine_response.body().to_vec())
        .build())
}

// fn build_request_url(origin: &str, path: &str) -> String {
//     format!("/{}/{}", origin, path)
// }