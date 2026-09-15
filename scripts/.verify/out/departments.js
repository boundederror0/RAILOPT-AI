"use strict";
// Departments mapped to the 14 demonstration postings.
// Request rows carry a human-facing department label; canonicalDepartment()
// maps those labels back to a DepartmentId for scope isolation checks.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TECHNICAL_DEPARTMENTS = exports.DEPARTMENT_REQUEST_LABEL = exports.DEPARTMENT_DISPLAY = exports.DIVISION_NAME = exports.ZONE_NAME = void 0;
exports.requestLabelToDepartmentId = requestLabelToDepartmentId;
exports.canonicalRequestDepartment = canonicalRequestDepartment;
exports.ZONE_NAME = "Southern Railway";
exports.DIVISION_NAME = "Madurai Division";
exports.DEPARTMENT_DISPLAY = {
    ADMINISTRATION: "Administration",
    OPERATING: "Operating Department",
    ENGINEERING: "Engineering Department",
    MECHANICAL: "Mechanical Department",
    ELECTRICAL: "Electrical Department",
    SIGNAL_AND_TELECOMMUNICATION: "Signal & Telecommunication Department",
    DIVISIONAL_ADMINISTRATION: "Divisional Administration",
};
// Human-facing labels used on request rows for each technical department.
exports.DEPARTMENT_REQUEST_LABEL = {
    ADMINISTRATION: "Administration",
    OPERATING: "Operating",
    ENGINEERING: "Track",
    MECHANICAL: "Mechanical",
    ELECTRICAL: "Electrical",
    SIGNAL_AND_TELECOMMUNICATION: "Signalling",
    DIVISIONAL_ADMINISTRATION: "Administration",
};
function requestLabelToDepartmentId(label) {
    const normalized = String(label ?? "").trim().toLowerCase();
    for (const dept of Object.keys(exports.DEPARTMENT_REQUEST_LABEL)) {
        if (exports.DEPARTMENT_REQUEST_LABEL[dept].toLowerCase() === normalized)
            return dept;
    }
    if (normalized === "civil" || normalized === "bridge")
        return "ENGINEERING";
    if (normalized === "s&t" || normalized === "signal")
        return "SIGNAL_AND_TELECOMMUNICATION";
    return null;
}
function canonicalRequestDepartment(value) {
    if (!value)
        return null;
    const upper = String(value).trim().toUpperCase();
    if (upper in exports.DEPARTMENT_REQUEST_LABEL)
        return upper;
    return requestLabelToDepartmentId(value);
}
exports.TECHNICAL_DEPARTMENTS = new Set([
    "ENGINEERING",
    "MECHANICAL",
    "ELECTRICAL",
    "SIGNAL_AND_TELECOMMUNICATION",
]);
