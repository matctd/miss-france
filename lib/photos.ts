// Photos officielles des 31 candidates Miss France 2027.
// Les images restent hébergées par leur source (20 Minutes — crédit photo : B. Decoin / Sipa / TF1) :
// ce module ne référence que des URLs, aucune image n'est copiée dans ce dépôt.
// En cas d'indisponibilité d'une photo, l'interface affiche un repli (initiale de la région).

export const MISS_PHOTOS: Record<string, string> = {
  "Alsace": `https://img.20mn.fr/2Tt_W2geSHmpiN9ldomO6Sk/460x0_miss-alsace-2026`,
  "Aquitaine": `https://img.20mn.fr/7xNyj8zORmmQvXTQK7yeBSk/460x0_miss-aquitaine-2026`,
  "Auvergne": `https://img.20mn.fr/yadKZkSIQkOR-0CEt44WkCk/460x0_miss-auvergne-2026`,
  "Bourgogne": `https://img.20mn.fr/amgK7WxrT2yQ1ug_jtti6Ck/460x0_miss-bourgogne-2026`,
  "Bretagne": `https://img.20mn.fr/xD2l7CLDQqSMT2zZE1GV8ik/460x0_miss-bretagne-2026`,
  "Centre-Val de Loire": `https://img.20mn.fr/wJ5Y6gr1Tx-xEaINCAmJCyk/460x0_miss-centre-val-de-loire-2026`,
  "Champagne-Ardenne": `https://img.20mn.fr/VrtyUsr5SPeLlRV1O3pejCk/460x0_miss-champagne-ardenne-2026`,
  "Corse": `https://img.20mn.fr/FC6bo4HjTPO5IC5fe9X_cyk/460x0_miss-corse-2026`,
  "Côte d'Azur": `https://img.20mn.fr/16SmdJTVSi68QIa4F3VD3yk/460x0_miss-cote-d-azur-2026`,
  "Franche-Comté": `https://img.20mn.fr/I-RhICn2TVy_6_TeRg4g3Sk/460x0_miss-franche-comte-2026`,
  "Guadeloupe": `https://img.20mn.fr/otg_vsopQi6CUR-6C-qh8yk/460x0_miss-guadeloupe-2026`,
  "Guyane": `https://img.20mn.fr/ZRdpYAbJRzG3Rvf4JYKtwik/460x0_miss-guyane-2026`,
  "Île-de-France": `https://img.20mn.fr/Vo2ycNbOQWGqZtKkvorQVik/460x0_miss-ile-de-france-2026`,
  "Languedoc": `https://img.20mn.fr/rRWLcuD5TUy7I9y3uf5W7yk/460x0_miss-languedoc-2026`,
  "Limousin": `https://img.20mn.fr/WQQ3CTrRRJiA3VBpLFwTTCk/460x0_miss-limousin-2026`,
  "Lorraine": `https://img.20mn.fr/7Cl2qdyhT4-5qlDUCDXNJik/460x0_miss-lorraine-2026`,
  "Martinique": `https://img.20mn.fr/1Y0wJYsWT66n56bAIgt7Vyk/460x0_miss-martinique-2026`,
  "Mayotte": `https://img.20mn.fr/-qLEjCk8Q3miZnug8T3ljSk/460x0_miss-mayotte-2026`,
  "Midi-Pyrénées": `https://img.20mn.fr/5Ir5rwroTfKmBkNdLuNvPSk/460x0_miss-midi-pyrenees-2026`,
  "Nord-Pas-de-Calais": `https://img.20mn.fr/MxUY20xrQKqh8vLP4mae8ik/460x0_miss-nord-pas-de-calais-2026`,
  "Normandie": `https://img.20mn.fr/ozoUDWxISb--GRSEWtgBTCk/460x0_miss-normandie-2026`,
  "Nouvelle-Calédonie": `https://img.20mn.fr/1dp2nKnvQjep_xRFNJzjxyk/460x0_miss-nouvelle-caledonie-2026`,
  "Pays de la Loire": `https://img.20mn.fr/Gf-Tv10WQsizYsKV_7_6KSk/460x0_miss-pays-de-la-loire-2026`,
  "Picardie": `https://img.20mn.fr/GTjJGTlBS3-E_CfeySB8USk/460x0_miss-picardie-2026`,
  "Poitou-Charentes": `https://img.20mn.fr/4MfFA5bSSEWiDaobPaFjiSk/460x0_miss-poitou-charentes-2026`,
  "Provence": `https://img.20mn.fr/fSJB3AobTleToswu1o5SFyk/460x0_miss-provence-2026`,
  "Réunion": `https://img.20mn.fr/3CJOeDevThCUAF53hUMonyk/460x0_miss-reunion-2026`,
  "Rhône-Alpes": `https://img.20mn.fr/NyM10i5sRzmEiWkmvAiLxSk/460x0_miss-rhone-alpes-2026`,
  "Roussillon": `https://img.20mn.fr/kgpqkOSeRuSr03_GAVdlGik/460x0_miss-roussillon-2026`,
  "Saint-Martin et Saint-Barthélemy": `https://img.20mn.fr/WpD2ZsnCSi6_-oUbGJv1oik/460x0_miss-saint-martin-et-saint-barthelemy-2026`,
  "Tahiti": `https://img.20mn.fr/ug8JFoTmSWCLJr5c9RPuwyk/460x0_miss-tahiti-2026`,
};

export function photoUrlFor(region: string): string {
  return MISS_PHOTOS[region] ?? '';
}
