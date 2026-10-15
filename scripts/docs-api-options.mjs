import ts from "typescript";

/**
 * Only advertise choices when they exhaust the accepted values. Undefined represents
 * omission and is not a choice; explicit null remains a value in a closed union.
 * Broad primitives, objects, callbacks and type parameters require reading the type.
 */
export function literalOptions(type) {
  const members = type.isUnion() ? type.types : [type];
  const options = [];
  for (const member of members) {
    if (member.flags & ts.TypeFlags.Undefined) continue;
    if (member.isStringLiteral() || member.isNumberLiteral()) {
      options.push(member.value);
    } else if (member.flags & ts.TypeFlags.BooleanLiteral) {
      options.push(member.intrinsicName === "true");
    } else if (member.flags & ts.TypeFlags.Null) {
      options.push(null);
    } else {
      return [];
    }
  }
  return options;
}
