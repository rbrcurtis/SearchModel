"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.id = id;
const bson_objectid_1 = __importDefault(require("bson-objectid"));
function id() {
    return new bson_objectid_1.default().toHexString();
}
//# sourceMappingURL=id.js.map