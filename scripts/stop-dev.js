#!/usr/bin/env node

/**
 * Cross-platform script to stop development servers
 * Stops both backend (port 3000) and frontend (port 5173) servers
 */

const { execSync, spawn } = require('child_process');
const os = require('os');

console.log('🛑 Stopping Demo App Development Servers');
console.log('');

const isWindows = os.platform() === 'win32';

/**
 * Kill processes using a specific port
 * @param {number} port - Port number to check
 * @param {string} name - Human readable name for the service
 */
async function killPort(port, name) {
    console.log(`🔍 Looking for processes on port ${port} (${name})...`);
    
    try {
        let pids = [];
        
        if (isWindows) {
            // Windows: Use netstat and taskkill
            const output = execSync(`netstat -ano | findstr :${port}`, { 
                encoding: 'utf8',
                stdio: 'pipe'
            }).trim();
            
            if (output) {
                const lines = output.split('\n');
                pids = lines.map(line => {
                    const parts = line.trim().split(/\s+/);
                    return parts[parts.length - 1];
                }).filter(pid => pid && pid !== '0');
                
                // Remove duplicates
                pids = [...new Set(pids)];
            }
        } else {
            // Unix: Use lsof
            try {
                const output = execSync(`lsof -ti:${port}`, { 
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).trim();
                
                if (output) {
                    pids = output.split('\n').filter(pid => pid);
                }
            } catch (error) {
                // lsof might not be available or no processes found
                pids = [];
            }
        }
        
        if (pids.length > 0) {
            console.log(`🔧 Stopping ${name} processes (PIDs: ${pids.join(', ')})...`);
            
            for (const pid of pids) {
                try {
                    if (isWindows) {
                        execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
                    } else {
                        execSync(`kill -TERM ${pid}`, { stdio: 'pipe' });
                    }
                } catch (error) {
                    // Process might already be gone
                }
            }
            
            console.log(`✅ ${name} server stopped`);
        } else {
            console.log(`ℹ️  No ${name} processes found on port ${port}`);
        }
        
    } catch (error) {
        console.log(`ℹ️  No ${name} processes found on port ${port}`);
    }
}

/**
 * Kill processes by name pattern
 * @param {string} pattern - Process name pattern to search for
 * @param {string} name - Human readable name for the service
 */
async function killByName(pattern, name) {
    console.log(`🔍 Looking for ${name} processes...`);
    
    try {
        let pids = [];
        
        if (isWindows) {
            // Windows: Use tasklist and findstr
            try {
                const output = execSync(`tasklist /FO CSV | findstr /i "${pattern}"`, { 
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).trim();
                
                if (output) {
                    const lines = output.split('\n');
                    pids = lines.map(line => {
                        const match = line.match(/"([^"]+)","(\d+)"/);
                        return match ? match[2] : null;
                    }).filter(pid => pid);
                }
            } catch (error) {
                // No processes found
            }
        } else {
            // Unix: Use pgrep
            try {
                const output = execSync(`pgrep -f "${pattern}"`, { 
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).trim();
                
                if (output) {
                    pids = output.split('\n').filter(pid => pid);
                }
            } catch (error) {
                // pgrep might not find anything
            }
        }
        
        if (pids.length > 0) {
            console.log(`🔧 Stopping ${name} processes (PIDs: ${pids.join(', ')})...`);
            
            for (const pid of pids) {
                try {
                    if (isWindows) {
                        execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
                    } else {
                        execSync(`kill -TERM ${pid}`, { stdio: 'pipe' });
                    }
                } catch (error) {
                    // Process might already be gone
                }
            }
            
            console.log(`✅ ${name} processes stopped`);
        } else {
            console.log(`ℹ️  No ${name} processes found`);
        }
        
    } catch (error) {
        console.log(`ℹ️  No ${name} processes found`);
    }
}

/**
 * Main function to stop all development servers
 */
async function stopServers() {
    // Stop servers by port
    await killPort(3000, 'Backend');
    await killPort(5173, 'Frontend');
    
    // Stop specific process patterns
    if (isWindows) {
        await killByName('node.exe', 'Node.js');
        await killByName('npm.cmd', 'NPM');
    } else {
        await killByName('ts-node server.ts', 'Backend (ts-node)');
        await killByName('nodemon.*server.ts', 'Backend (nodemon)');
        await killByName('vite.*config', 'Frontend (Vite)');
        await killByName('npm.*run.*dev', 'NPM dev');
        await killByName('concurrently', 'Concurrently');
    }
    
    console.log('');
    console.log('✅ Demo App development servers stopped!');
    console.log('');
    console.log('ℹ️  Ports 3000 and 5173 should now be available');
    console.log('ℹ️  You can start development again with: npm run dev:full');
    console.log('');
}

// Run the script
stopServers().catch(error => {
    console.error('❌ Error stopping servers:', error.message);
    process.exit(1);
});
