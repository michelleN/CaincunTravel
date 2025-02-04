use anyhow::Result;
use uuid::Uuid;
use spin_sdk::{
    http::{send, IntoResponse, Method, Params, Request, RequestBuilder, Response, ResponseBuilder, Router},
    key_value::Store
};
use spin_sdk::http_component;

#[http_component]
fn handle_request(req: Request) -> anyhow::Result<impl IntoResponse> {
    let mut router = Router::default();
    router.get("/", route_by_cookie);
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

    let mut uuid: String;


    // uuid = Some(has_desired_cookie(&req)) = uuid_cookie {
    // let cookies = req.header("cookie");
    //     if let Some(cookie_header) = cookies {
    //         if let Some(cookie_str) = cookie_header.as_str() {
    //             for c in cookie_str.split(";") {
    //                 if c.contains("uuid") {
    //                     let pieces: Vec<&str> = c.split("=").collect();
    //                     match store.get(pieces[1]) {
    //                         Ok(_) => {
    //                             uuid = pieces[1]
    //                             /* valid user session found, inspect value? */
    //                         },
    //                     };
    //                 }
    //             }
    //         }
    //     }
    // } else {
    //          // Create a new uuid/session
    //          uuid = Uuid::new_v4();
    //          store.set(uuid, "TBD-start-of-game".as_bytes());
    // };

    let uuid: String =  match has_desired_cookie(&req) {
        Some(cookie_header) => {
            cookie_header
            .split(';')
            .find_map(|cookie| {
                let mut parts = cookie.trim().split('=');
                match (parts.next(), parts.next()) {
                    (Some("uuid"), Some(value)) => Some(value.to_string()),
                    _ =>  Some(Uuid::new_v4().to_string()),
                }
            }).unwrap()
        },
        None => {
            Uuid::new_v4().to_string()
        }
    };


    // Is the uuid in the store?
    // No: store it with "in-prog" or something
    // Yes: retrieve from store and somehow analyze value 

    // store.set(uuid, "TBD-start-of-game".as_bytes());


    let engine_route = "/engine";
    let engine_req = RequestBuilder::new(Method::Get, engine_route).build();
    // TODO: hand the entire cookie as-is to the engine?  Or just the session?
    // engine_req.set_header("cookie", req.header("cookie"));
    let engine_response: Response = send(engine_req).await?;

    Ok(ResponseBuilder::new(200)
        .header("content-type", "text/html")
        .header(
            "set-cookie",
            format!("caincun-travel=yes;Path=/;SameSite=Lax;Max-Age=3600;UUID={}", uuid),
        )
        .body(engine_response.body().to_vec())
        .build())
}

// fn build_request_url(origin: &str, path: &str) -> String {
//     format!("/{}/{}", origin, path)
// }