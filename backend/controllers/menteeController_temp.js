// Aggiungere alla fine del file menteeController.js:

// OPZIONI FILTRI (CATEGORIE E LINGUE)
export const GetFilterOptions = async (req, res) => {
  try {
    const options = await Mentor.getOptions();

    res.json({
      success: true,
      data: {
        categorie: options.settori.map(s => ({ nome: s })),
        lingue: options.lingue.map(l => ({ nome: l })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching options' });
  }
};
