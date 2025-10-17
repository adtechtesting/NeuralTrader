import { prisma } from '../lib/cache/dbCache';


async function clearOldMessages() {
  try {
    console.log('🗑️  Clearing old messages...');
    
    const result = await prisma.message.deleteMany({});
    
    console.log(`✅ Deleted ${result.count} old messages`);
    console.log('💡 New messages will use the selected token symbol');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing messages:', error);
    process.exit(1);
  }
}

clearOldMessages();
