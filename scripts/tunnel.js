const ngrok = require('@ngrok/ngrok');

async function startTunnel() {
  const args = process.argv.slice(2);
  let authtoken = process.env.NGROK_AUTHTOKEN;
  let port = 3000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if (!args[i].startsWith('--') && !authtoken) {
      authtoken = args[i];
    }
  }

  if (!authtoken) {
    console.log('\n==========================================================');
    console.log('⚠️  NGROK AUTHTOKEN REQUIRED');
    console.log('==========================================================');
    console.log('ngrok requires a free account authtoken to establish a tunnel.');
    console.log('\nTo get your free authtoken (takes 30 seconds):');
    console.log('1. Go to: https://dashboard.ngrok.com/signup (or login)');
    console.log('2. Copy your token from: https://dashboard.ngrok.com/get-started/your-authtoken');
    console.log('\nThen run:');
    console.log('   npm run tunnel <YOUR_AUTHTOKEN>');
    console.log('or:');
    console.log('   $env:NGROK_AUTHTOKEN="<YOUR_AUTHTOKEN>"; npm run tunnel');
    console.log('==========================================================\n');
    process.exit(1);
  }

  try {
    console.log(`\nStarting ngrok tunnel for http://localhost:${port}...`);
    const listener = await ngrok.connect({
      addr: port,
      authtoken: authtoken,
    });

    const publicUrl = listener.url();
    const wsUrl = publicUrl.replace(/^http/, 'ws');

    console.log('\n==========================================================');
    console.log('🎉 NGROK TUNNEL ONLINE!');
    console.log('==========================================================');
    console.log(`🌐 Public HTTPS Web URL:  ${publicUrl}`);
    console.log(`📡 Public WSS Voice URL:  ${wsUrl}/ws/voice`);
    console.log(`🔗 Backend API Base:      ${publicUrl}/api`);
    console.log('==========================================================');
    console.log('\n📱 You can now open the HTTPS URL from your phone or any external');
    console.log('   device to test the real-time AI voice assistant from anywhere!\n');
    console.log('Press Ctrl+C to stop the tunnel.\n');

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log('\nClosing ngrok tunnel...');
      await listener.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('\n❌ Failed to connect ngrok tunnel:');
    console.error(err.message || err);
    console.log('\nIf this token is invalid or expired, check: https://dashboard.ngrok.com/get-started/your-authtoken\n');
    process.exit(1);
  }
}

startTunnel();
