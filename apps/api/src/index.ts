/**
 * TabFlow API – Azure Functions Entry Point
 *
 * This file imports all function modules to register them with the Azure Functions runtime.
 * Each function module self-registers using `app.http()` or similar.
 *
 * Note: This is the v4 programming model where functions are registered declaratively.
 */

// Import function modules to register them
import "./functions/authGoogle";

// Future functions will be imported here:
// import "./functions/syncPush";
// import "./functions/syncPull";
// import "./functions/aiGroup";

console.log("[TabFlow API] Functions registered");

