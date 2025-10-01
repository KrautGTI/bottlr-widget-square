const io = require('socket.io-client');

// Store the responses
let status_updates = [];
let response_chunks = [];
let table_data = {};
let artifacts = [];
let bttlr_workflow_data = {};
let final_response = "";
let received_error = false;
let chunk_count = 0;
let follow_up = null;

// -------------------------------
// Event Handlers
// -------------------------------
function setupEventHandlers(socket) {
    socket.on('connect', () => {
        console.log('Connected to Bttlr server!');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from Bttlr server');
    });

    socket.on('bttlr-stream-start', (data) => {
        console.log('Stream started:', data);
    });

    socket.on('bttlr-status-update', (data) => {
        console.log(`Status Update: ${data.status}`);
        status_updates.push(data.status);
    });

    socket.on('bttlr-stream-chunk', (data) => {
        const chunk = data.chunk;
        response_chunks.push(chunk);
        chunk_count++;
        process.stdout.write(chunk);
    });

    socket.on('bttlr-stream-metadata', (data) => {
        table_data = data.table_data;
        console.log(`\nMetadata received: ${Object.keys(table_data)}`);
    });

    socket.on('bttlr-artifacts', (data) => {
        artifacts.push(data);
        console.log(`\nArtifacts received: ${Object.keys(data)}`);
    });

    socket.on('bttlr-workflow-metadata', (data) => {
        bttlr_workflow_data = data.bttlr_api_workflow_data;
        console.log(`\nWorkflow metadata received: ${Object.keys(bttlr_workflow_data)}`);
    });

    socket.on('bttlr-stream-end', (data) => {
        final_response = data.final_response;
        console.log(`\n\nTotal chunks received: ${chunk_count}`);
        console.log('Stream complete!');
    });

    socket.on('bttlr-stream-error', (data) => {
        received_error = true;
        console.log(`\nERROR: ${data.error}`);
    });

    socket.on('bttlr-follow-up', (data) => {
        follow_up = data.follow_up;
        console.log(`\nFollow Up: ${follow_up}`);
    });
}

// -------------------------------
// Test Helpers
// -------------------------------
function sendQuery(socket, data) {
    socket.emit('bttlr-stream', data);
}

function runBttlrTest(server_url, data, timeout = 600000) {
    return new Promise((resolve, reject) => {
        // Reset global state
        status_updates = [];
        response_chunks = [];
        table_data = {};
        artifacts = [];
        bttlr_workflow_data = {};
        final_response = "";
        received_error = false;
        chunk_count = 0;
        follow_up = null;

        console.log(`Connecting to ${server_url}...`);
        
        const socket = io(server_url, {
            transports: ['websocket', 'polling']
        });

        setupEventHandlers(socket);

        socket.on('connect', () => {
            console.log(`Sending query: ${data.query}`);
            sendQuery(socket, data);

            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (received_error || final_response) {
                    clearInterval(checkInterval);
                    socket.disconnect();
                    resolve({
                        status_updates,
                        response_chunks,
                        table_data,
                        bttlr_workflow_data,
                        artifacts,
                        final_response,
                        error: received_error,
                        chunk_count,
                        follow_up
                    });
                } else if (Date.now() - startTime >= timeout) {
                    clearInterval(checkInterval);
                    console.log('Warning: Request timed out');
                    socket.disconnect();
                    resolve({
                        status_updates,
                        response_chunks,
                        table_data,
                        bttlr_workflow_data,
                        artifacts,
                        final_response,
                        error: received_error,
                        chunk_count,
                        follow_up
                    });
                }
            }, 1000);
        });

        socket.on('connect_error', (error) => {
            console.log(`Error: ${error.message}`);
            reject(error);
        });
    });
}

// -------------------------------
// Run Test
// -------------------------------
const live_url = "http://nishantbundela.com";

const data = {
    chat_id: "test-chat-123",
    user_id: "user-001",
    user_email: "test@example.com",
    query: "What wines pair well with steak?"
};

// Run the test
runBttlrTest(live_url, data)
    .then(response => {
        console.log('\n\n=== Final Results ===');
        console.log(JSON.stringify(response, null, 2));
    })
    .catch(error => {
        console.error('Test failed:', error);
    });