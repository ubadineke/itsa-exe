const si = require('systeminformation');
const axios = require('axios');

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Usage: node collectInfo.js <email> <setup-id>');
    process.exit(1);
}
const email = args[0];
const setupId = args[1];
console.log(email, setupId);
// Function to collect and send system information
async function sendSystemInfo() {
    try {
        const system = await si.system();
        const osInfo = await si.osInfo();
        const cpu = await si.cpu();
        const mem = await si.mem();

        const systemInfo = {
            email,
            setupId,
            system,
            osInfo,
            cpu,
            mem,
        };

        await axios.post('http://localhost:3000/api/staff/register-device', systemInfo).then(() => {
            console.log('System information sent successfully');
            process.exit(1);
        });
    } catch (error) {
        console.error('Error collecting or sending system information:', error.response);
    }
}

sendSystemInfo();
