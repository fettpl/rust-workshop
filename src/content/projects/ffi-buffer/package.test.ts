import { describe, expect, it } from "vitest";
import {
  projectFiles,
  validateProjectPackage,
} from "../../../domain/project-package";
import { ffiBufferPackage, ffiBufferProject } from "../ffi-buffer";

describe("FFI buffer archive contract", () => {
  it("provides a checked-in native buffer package", () => {
    expect(validateProjectPackage(ffiBufferPackage)).toEqual([]);
    expect(ffiBufferPackage.id).toBe("ffi-buffer-workshop");
    expect(ffiBufferProject.id).toBe("ffi-buffer");
    expect(ffiBufferPackage.revealStepRefs).toHaveLength(2);

    const solution = projectFiles(ffiBufferPackage, "solution");
    expect(Object.keys(solution)).toEqual(
      expect.arrayContaining([
        "Cargo.toml",
        "Cargo.lock",
        "README.md",
        "SAFETY.md",
        "build.rs",
        "ffi_buffer.h",
        "ffi_buffer.c",
        "src/lib.rs",
        "src/sys.rs",
        "tests/native_integration.rs",
      ]),
    );
    expect(solution["Cargo.toml"]).toContain('edition = "2024"');
    expect(solution["Cargo.toml"]).toContain('rust-version = "1.85.0"');
    expect(solution["build.rs"]).toContain("Command::new(program)");
    expect(solution["build.rs"]).toContain('"cc"');
    expect(solution["ffi_buffer.h"]).toContain("ffi_buffer_create");
    expect(solution["ffi_buffer.c"]).toContain("FFI_BUFFER_MAX_LEN");
    expect(solution["ffi_buffer.c"]).toContain("ffi_buffer_release_count");
    expect(solution["src/sys.rs"]).toContain('extern "C"');
    expect(solution["src/lib.rs"]).toContain("impl Drop for Buffer");
    expect(solution["tests/native_integration.rs"]).toContain(
      "rejects_deterministic_native_failure",
    );
    expect(solution["tests/native_integration.rs"]).toContain(
      "ffi_buffer_release_count",
    );
    expect(solution["tests/native_integration.rs"]).toContain(
      "drop_releases_the_native_owner_without_manual_free",
    );
  });

  it("keeps the starter unfinished while retaining the native contract", () => {
    const starter = projectFiles(ffiBufferPackage, "starter");
    expect(starter["src/lib.rs"]).toContain("todo!");
    expect(starter["src/sys.rs"]).toContain("TODO(ffi)");
    expect(starter["ffi_buffer.h"]).toContain("ffi_buffer_destroy");
    expect(starter["tests/native_integration.rs"]).toContain(
      "Buffer::from_bytes",
    );
    expect(starter["tests/native_integration.rs"]).toContain(
      "ffi_buffer_release_count",
    );
  });
});
