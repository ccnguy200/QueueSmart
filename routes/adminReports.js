// Admin Reports 
// Shows queue usage reports

const express = require('express');
const router = express.Router();
const { NotificationHistory, Service, QueueEntry } = require('../tables');

function buildWhere(query) {
    const where = { type: "history" };
    if (query.service && String(query.service).trim() !== "") {
        where.service = String(query.service).trim();
    }
    return where;
}

function inDateRange(dateStr, from, to) {
    const d = String(dateStr || "");
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(String(from)) && d < String(from)) return false;
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(String(to)) && d > String(to)) return false;
    return true;
}

// Build the report
function buildReport(records, services) {
    const byServiceMap = {};
    const usersMap = {};

    let served = 0;
    let missed = 0;
    let left = 0;
    let totalWait = 0;

    for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const serviceName = r.service || "Unknown";
        const userName = r.userName || "Unknown";
        
        if (!byServiceMap[serviceName]) {
            byServiceMap[serviceName] = {
                service: serviceName,
                served: 0,
                missed: 0,
                left: 0,
                totalWait: 0,
                avgWait: 0
            };
        }
        if (!usersMap[userName]) {
            usersMap[userName] = {
                userName: userName,
                served: 0,
                missed: 0,
                left: 0,
                totalWait: 0
            };
        }
        const bucket = byServiceMap[serviceName];
        const user = usersMap[userName];

        if (r.outcome === "Served") {
            served++;
            totalWait += Number(r.wait) || 0;
            bucket.served++;
            bucket.totalWait += Number(r.wait) || 0;
            user.served++;
            user.totalWait += Number(r.wait) || 0;
        } 
        else if (r.outcome === "Missed") {
            missed++;
            bucket.missed++;
            user.missed++;
        } 
        else if (r.outcome === "Left Queue") {
            left++;
            bucket.left++;
            user.left++;
        }
    }
    
    const byService = [];
    
    for (const name in byServiceMap) {
        const s = byServiceMap[name];
        s.avgWait = s.served > 0 ? Math.round(s.totalWait / s.served) : 0;
        // Attach the service's priority/duration for context
        const svc = services.find(function (x) { return x.name === name; });
        if (svc) {
            s.priority = svc.priority;
            s.duration = svc.duration;
        }
        byService.push(s);
    }

    byService.sort(function (a, b) { return b.served - a.served; });

    const users = [];
    for (const name in usersMap) {
        users.push(usersMap[name]);
    }

    users.sort(function (a, b) { return b.served - a.served; });

    const totalOutcomes = served + missed;
    const avgWait = served > 0 ? Math.round(totalWait / served) : 0;
    const noShowRate = totalOutcomes > 0 ? Math.round((missed / totalOutcomes) * 100) : 0;

    return {
        totals: {
            served: served,
            missed: missed,
            left: left,
            avgWait: avgWait,
            noShowRate: noShowRate,
            totalRecords: records.length
        },
        byService: byService,
        users: users
    };
}

// JSON report
router.get('/', async function (req, res) {
    try {
        const where = buildWhere(req.query);

        const allRecords = await NotificationHistory.findAll({
            where: where,
            order: [['createdAt', 'DESC']]
        });

        // Apply date range filter in JS
        const records = allRecords.filter(function (r) {
            return inDateRange(r.date, req.query.from, req.query.to);
        });

        const services = await Service.findAll();
        const report = buildReport(records, services);

        return res.json({
            success: true,
            filters: {
                from: req.query.from || null,
                to: req.query.to || null,
                service: req.query.service || null
            },
            totals: report.totals,
            byService: report.byService,
            users: report.users
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// CSV export
router.get('/export.csv', async function (req, res) {
    try {
        const where = buildWhere(req.query);
        const allRecords = await NotificationHistory.findAll({
            where: where,
            order: [['createdAt', 'DESC']]
        });

        // Apply date range filter in JS
        const records = allRecords.filter(function (r) {
            return inDateRange(r.date, req.query.from, req.query.to);
        });

        const services = await Service.findAll();
        const report = buildReport(records, services);

        // Build CSV
        const lines = [];

        // Totals
        lines.push('Totals');
        lines.push('Served,Missed,Left,Average Wait (min),No-Show Rate (%)');
        lines.push([
            report.totals.served,
            report.totals.missed,
            report.totals.left,
            report.totals.avgWait,
            report.totals.noShowRate
        ].join(','));
        lines.push('');

        // By service
        lines.push('By Service');
        lines.push('Service,Served,Missed,Left,Average Wait (min),Priority,Duration (min)');
        for (let i = 0; i < report.byService.length; i++) {
            const s = report.byService[i];
            lines.push([
                csvEscape(s.service),
                s.served,
                s.missed,
                s.left,
                s.avgWait,
                csvEscape(s.priority || ''),
                s.duration || ''
            ].join(','));
        }
        lines.push('');

        // By user
        lines.push('By User');
        lines.push('User,Served,Missed,Left,Total Wait (min)');
        for (let i = 0; i < report.users.length; i++) {
            const u = report.users[i];
            lines.push([
                csvEscape(u.userName),
                u.served,
                u.missed,
                u.left,
                u.totalWait
            ].join(','));
        }

        const csv = lines.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="queuesmart-report.csv"');
        return res.send(csv);
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// In order to make it CSV-safe 
function csvEscape(value) {
    const s = String(value === null || value === undefined ? '' : value);
    if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

module.exports = {
    router: router,
    buildWhere: buildWhere,
    buildReport: buildReport,
    inDateRange: inDateRange
};