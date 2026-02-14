import pool from '../config/database.js';

class Availability {
    static async getAvailability(idUtente) {
        const result = await pool.query(
            'SELECT * FROM "Disponibilita" WHERE "Id_Utente" = $1 ORDER BY "Giorno" ASC, "Ora_Inizio" ASC',
            [idUtente]
        );
        return result.rows;
    }

    static async deleteAvailability(idUtente, giorno, ora_inizio, ora_fine) {
        const result = await pool.query(
            `
            DELETE FROM "Disponibilita"
            WHERE "Id_Utente" = $1
              AND "Giorno" = $2
              AND "Ora_Inizio"::time = $3::time
              AND "Ora_Fine"::time = $4::time
            `,
            [idUtente, giorno, ora_inizio, ora_fine]
        );

        return result.rowCount;
    }

    static async addAvailability(idUtente, disponibilita) {
        const result = await pool.query(
            'INSERT INTO "Disponibilita" ("Id_Utente", "Giorno", "Ora_Inizio", "Ora_Fine") VALUES ($1, $2, $3, $4) RETURNING *',
            [idUtente, disponibilita.giorno, disponibilita.ora_inizio, disponibilita.ora_fine]
        );
        return result.rows[0];
    }

    static async addMultipleAvailability(idUtente, disponibilitaArray) {
        const results = [];
        console.log('  → addMultipleAvailability START: idUtente=' + idUtente + ', slots=' + disponibilitaArray.length);
        
        for (let i = 0; i < disponibilitaArray.length; i++) {
            const disp = disponibilitaArray[i];
            console.log(`  → Inserendo slot ${i+1}/${disponibilitaArray.length}`);
            console.log(`    Giorno (numero): ${disp.giorno}`);
            console.log(`    Ora_Inizio: ${disp.ora_inizio}`);
            console.log(`    Ora_Fine: ${disp.ora_fine}`);
            
            // Validazione prima di inserire
            if (!disp.giorno || !disp.ora_inizio || !disp.ora_fine) {
                throw new Error(`Slot incompleto: giorno=${disp.giorno}, inizio=${disp.ora_inizio}, fine=${disp.ora_fine}`);
            }
            
            if (disp.giorno < 1 || disp.giorno > 7) {
                throw new Error(`Giorno non valido: ${disp.giorno}. Deve essere tra 1 e 7`);
            }
            
            const result = await pool.query(
                'INSERT INTO "Disponibilita" ("Id_Utente", "Giorno", "Ora_Inizio", "Ora_Fine") VALUES ($1, $2, $3, $4) RETURNING *',
                [idUtente, disp.giorno, disp.ora_inizio, disp.ora_fine]
            );
            results.push(result.rows[0]);
            console.log(`    ✓ Inserito con ID: ${result.rows[0].Id_Disponibilita}`);
        }
        console.log('  → addMultipleAvailability SUCCESS: ' + results.length + ' slot salvati');
        return results;
    }

    static async updateAvailability(idUtente, disponibilita) {
        const result = await pool.query(
            'UPDATE "Disponibilita" SET "Giorno" = $1, "Ora_Inizio" = $2, "Ora_Fine" = $3 WHERE "Id_Utente" = $4 RETURNING *',
            [disponibilita.giorno, disponibilita.ora_inizio, disponibilita.ora_fine, idUtente]
        );
        return result.rows[0];
    }
}

export default Availability;