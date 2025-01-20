const fs = require('fs').promises;
const path = require('path');

const TICKETS_FILE = path.join(__dirname, '../data/tickets.json');

async function ensureDirectoryExists() {
    const dir = path.dirname(TICKETS_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function loadTickets() {
    try {
        await ensureDirectoryExists();
        const data = await fs.readFile(TICKETS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {

        return {};
    }
}

async function saveTickets(tickets) {
    await ensureDirectoryExists();
    await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

module.exports = {
    name: 'ticketStore',
    async setTicketData(channelId, data) {
        const tickets = await loadTickets();
        tickets[channelId] = data;
        await saveTickets(tickets);
    },

    async getTicketData(channelId) {
        const tickets = await loadTickets();
        return tickets[channelId];
    },

    async removeTicketData(channelId) {
        const tickets = await loadTickets();
        delete tickets[channelId];
        await saveTickets(tickets);
    }
};