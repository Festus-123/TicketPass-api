import app from "../src/app/app";
import { describe, it, expect } from "vitest";
import request from "supertest";

describe("GET /health", () => {
    it('returns a 200 and status Ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toStrictEqual({ status: 'ok'});
    })
})