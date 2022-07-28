// build.rs
use std::env;
use std::path::PathBuf;

fn main() {
  c_bindgen();
    
  node_bindgen::build::configure();
}

fn c_bindgen() {

    println!("cargo:rerun-if-changed=wrapper.h");
    let bindings = bindgen::Builder::default()
        .header("wrapper.h")
        .parse_callbacks(Box::new(bindgen::CargoCallbacks))
        
        .generate()
        .expect("Err.Unable to generate bindings");
    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Err.Unable to write bindings");
}