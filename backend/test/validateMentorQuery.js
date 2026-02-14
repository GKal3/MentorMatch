import Mentor from '../models/Mentor.js';

async function testMentorGetPersonalById() {
    try {
        // Simulate calling the getPersonalById method directly (what the controller calls)
        const mentor = await Mentor.getPersonalById(1);
        
        console.log('✓ Mentor.getPersonalById() returned:');
        console.log(JSON.stringify(mentor, null, 2));
        
        // Check if Data_Nascita is a string
        if (mentor && mentor.Data_Nascita) {
            console.log(`\n✓ Data_Nascita field analysis:`);
            console.log(`  - Value: "${mentor.Data_Nascita}"`);
            console.log(`  - Type: ${typeof mentor.Data_Nascita}`);
            console.log(`  - Is string: ${typeof mentor.Data_Nascita === 'string'}`);
            
            // Test the frontend's formatDateForDisplay function logic
            const dateValue = mentor.Data_Nascita;
            const dateString = typeof dateValue === 'string' ? dateValue : new Date(dateValue).toISOString();
            const parts = dateString.slice(0, 10).split('-');
            const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
            
            console.log(`\n✓ Frontend formatting would produce: "${formatted}"`);
        } else {
            console.error('✗ Data_Nascita field is missing!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testMentorGetPersonalById();
