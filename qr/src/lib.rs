use percent_encoding::percent_decode;
use qrcode_generator::{to_svg_to_string, QrCodeEcc};
use spin_sdk::http::{IntoResponse, Request, ResponseBuilder};
use spin_sdk::http_component;
use spin_sdk::variables;

/// A simple Spin HTTP component.
#[http_component]
fn handle_qr(req: Request) -> anyhow::Result<impl IntoResponse> {
    let url: String;

    if req.query() != "" {
        url = req.query().to_string();
    } else if let Ok(qr_url) = variables::get("qr_url") {
        url = qr_url;
    } else {
        url = "https://www.fermyon.com/spin".to_string();
    };

    println!("Generating QR code for: {}", url);

    let decoded_query = percent_decode(url.as_bytes()).decode_utf8();
    let svg = to_svg_to_string(
        decoded_query.unwrap().as_ref(),
        QrCodeEcc::Medium,
        512,
        None::<String>,
    ).expect(format!("Failed to generate QR code for: {}", url).as_str());

    Ok(ResponseBuilder::new(200)
        .body(svg.into_bytes())
        .build())
}
