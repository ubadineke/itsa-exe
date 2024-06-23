// const si = require('systeminformation');
import si from 'systeminformation';
import axios from 'axios';
import os from 'os';
import { publicIpv4 } from 'public-ip';

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Usage: node collectInfo.js <email> <setup-id>');
    process.exit(1);
}
const email = args[0];
const setupId = args[1];
// console.log(email, setupId);
// Function to collect and send system information
async function sendSystemInfo() {
    try {
        const system = await si.system();
        const osInfo = await si.osInfo();
        const cpu = await si.cpu();
        const mem = await si.mem();
        const battery = await si.battery();
        const diskLayout = await si.diskLayout();

        const ip = await publicIpv4();
        const network = await axios.post(`http://ip-api.com/json/${ip}`);
        const { city, lon, lat } = network.data;

        const systemInfo = {
            city,
            lon,
            lat,
            email,
            setupId,
            system,
            osInfo,
            cpu,
            mem,
            battery,
            diskLayout,
        };
        console.log(systemInfo);
        // console.log(os.networkInterfaces());
        // console.log(await publicIpv4());

        console.log(lon, lat);
        // staff, device, description, technician;
        await axios
            .post('http://localhost:3000/api/sub-admin/register-device', systemInfo)
            .then(() => {
                console.log('System information sent successfully');
                process.exit(1);
            });

        process.exit(1);
    } catch (error) {
        console.log(error);
        console.error('Error collecting or sending system information:', error.response);
    }
}

sendSystemInfo();
