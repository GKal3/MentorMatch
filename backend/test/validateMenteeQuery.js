import Mentee from '../models/Mentee.js';

async function testMenteeArea() {
    try {
        // Simulate calling findByUserId (what the controller calls)
        const mentee = await Mentee.findByUserId(1);
        
        console.log('✓ Mentee.findByUserId(1) returned:');
        console.log(JSON.stringify(mentee, null, 2));
        
        // Check the Data_Nascita field format
        if (mentee && mentee.Data_Nascita) {
            console.log(`\n✓ Data_Nascita field analysis:`);
            console.log(`  - Value: "${mentee.Data_Nascita}"`);
            console.log(`  - Type: ${typeof mentee.Data_Nascita}`);
            console.log(`  - Is string: ${typeof mentee.Data_Nascita === 'string'}`);
            
            // Simulate the frontend formatting
            const dateValue = mentee.Data_Nascita;
            const dateString = typeof dateValue === 'string' ? dateValue : new Date(dateValue).toISOString();
            const parts = dateString.slice(0, 10).split('-');
            const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
            
            console.log(`\n✓ Frontend would format as: "${formatted}"`);
        } else {
            console.error('✗ No Data_Nascita field in result!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testMenteeArea();
