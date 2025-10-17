import { prisma } from '../lib/cache/dbCache';

/**
 * Check what token is currently selected
 */
async function checkSelectedToken() {
  try {
    console.log('🔍 Checking selected token...\n');
    
    const config = await prisma.simulationConfig.findUnique({
      where: { key: 'selected_token' }
    });
    
    if (!config) {
      console.log('❌ No token selected yet');
      console.log('💡 Visit http://localhost:3000/token-setup to select a token\n');
      process.exit(0);
    }
    
    const tokenData = JSON.parse(config.value);
    
    console.log('✅ Selected Token:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Symbol:       ${tokenData.symbol || 'N/A'}`);
    console.log(`Name:         ${tokenData.name || 'N/A'}`);
    console.log(`Mint:         ${tokenData.mint || 'N/A'}`);
    console.log(`Decimals:     ${tokenData.decimals || 'N/A'}`);
    console.log(`Price:        $${tokenData.usdPrice || 'N/A'}`);
    console.log(`Market Cap:   $${tokenData.mcap ? (tokenData.mcap / 1e6).toFixed(2) + 'M' : 'N/A'}`);
    console.log(`Liquidity:    $${tokenData.liquidity ? (tokenData.liquidity / 1e6).toFixed(2) + 'M' : 'N/A'}`);
    console.log(`Holders:      ${tokenData.holderCount ? tokenData.holderCount.toLocaleString() : 'N/A'}`);
    console.log(`Verified:     ${tokenData.isVerified ? '✓' : '✗'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Check recent messages
    const recentMessages = await prisma.message.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        content: true,
        createdAt: true,
        sender: {
          select: { name: true }
        }
      }
    });
    
    if (recentMessages.length > 0) {
      console.log('📝 Recent Messages:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      recentMessages.forEach(msg => {
        const time = new Date(msg.createdAt).toLocaleTimeString();
        console.log(`[${time}] ${msg.sender?.name || 'Unknown'}: ${msg.content.substring(0, 80)}${msg.content.length > 80 ? '...' : ''}`);
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Check if messages mention the selected token
      const mentionsToken = recentMessages.some(msg => 
        msg.content.includes(tokenData.symbol)
      );
      
      if (mentionsToken) {
        console.log(`✅ Messages are using ${tokenData.symbol}`);
      } else {
        console.log(`⚠️  Messages don't mention ${tokenData.symbol}`);
        console.log(`💡 Clear old messages: npx tsx src/scripts/clear-old-messages.ts`);
      }
    } else {
      console.log('📝 No messages yet - simulation hasn\'t started\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSelectedToken();
