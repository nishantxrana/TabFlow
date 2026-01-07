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
import "./functions/syncUpload";

// Future functions will be imported here:
// import "./functions/syncDownload";
// import "./functions/aiGroup";

console.log("[TabFlow API] Functions registered");
