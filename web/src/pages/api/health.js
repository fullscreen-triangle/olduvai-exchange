import { methodNotAllowed, proxy } from "@/lib/api/upstream";

/**
 * The only route here with a real engine behind it.
 *
 * ⭐ Worth reading the response rather than just its status: upstream returns
 * `coordinate_fn: null` until a `CoordinateFn` exists, and a null there means *addresses
 * are not yet meaningful*. A client that treats it as a default and renders addresses
 * anyway is showing coordinates that no encoder produced.
 */
export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "GET")) return;
  return proxy(req, res, "/health");
}
