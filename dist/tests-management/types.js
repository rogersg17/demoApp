"use strict";
// Type definitions for test management application
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = exports.TestExecutionError = void 0;
exports.isTestStatus = isTestStatus;
exports.isNotificationType = isNotificationType;
exports.isExecutionStatus = isExecutionStatus;
// Type guards
function isTestStatus(value) {
    return ['not-run', 'passed', 'failed', 'skipped', 'running'].includes(value);
}
function isNotificationType(value) {
    return ['info', 'success', 'warning', 'error'].includes(value);
}
function isExecutionStatus(value) {
    return ['running', 'completed', 'failed'].includes(value);
}
class TestExecutionError extends Error {
    code;
    details;
    constructor(message, code = 'EXECUTION_ERROR', details) {
        super(message);
        this.name = 'TestExecutionError';
        this.code = code;
        this.details = details;
    }
}
exports.TestExecutionError = TestExecutionError;
class ApiError extends Error {
    code;
    status;
    details;
    constructor(message, status, code = 'API_ERROR', details) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
}
exports.ApiError = ApiError;
