import ObjectID from 'bson-objectid';
export function id() {
    return new ObjectID().toHexString();
}
//# sourceMappingURL=id.js.map