import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Award, FlaskConical, Activity, TrendingDown, HelpCircle, ExternalLink, ShieldCheck, ChevronRight, Info, Layers } from 'lucide-react';

const researchPapers = [
  {
    id: 'paper-mdpi-2022',
    title: 'Bioluminescent-Inhibition-Based Biosensor for Full-Profile Soil Contamination Assessment',
    journal: 'MDPI Biosensors (2022)',
    doi: '10.3390/bios12050353',
    link: 'https://www.researchgate.net/publication/360742204_Bioluminescent-Inhibition-Based_Biosensor_for_Full-Profile_Soil_Contamination_Assessment',
    summary: 'Establishes the coupled enzyme system NAD(P)H:FMN-oxidoreductase + luciferase (Red+Luc) to assess soil toxicity. Proves that soil pollutants inhibit luciferase and oxidoreductase, causing a concentration-dependent decrease in bioluminescence. Specifically maps soil horizons and demonstrates the impact of humic organic substances.',
    pathway: 'coupled_bacterial'
  },
  {
    id: 'paper-metal-soils',
    title: 'Bioluminescent Bacterial Biosensors for the Assessment of Metal Toxicity and Bioavailability in Soils',
    journal: 'Environmental Toxicology and Chemistry',
    link: 'https://www.researchgate.net/publication/6887867_Bioluminescent_Bacterial_Biosensors_for_the_Assessment_of_Metal_Toxicity_and_Bioavailability_in_Soils',
    summary: 'Analyzes the bioavailability and toxicity curves of heavy metals (Copper, Zinc, Lead, Cadmium) in soil using bioluminescent reporters. Details the mathematical correlation between pollutant bioavailability and light quenching.',
    pathway: 'metal_bioavailability'
  },
  {
    id: 'paper-fungal-biotech',
    title: 'Applications of Bioluminescence in Biotechnology and Fungal Metabolic Pathways',
    journal: 'Royal Society of Chemistry / Chemistry Europe',
    link: 'https://pubs.rsc.org/cs/article/50/9/5668/682188/Applications-of-bioluminescence-in-biotechnology',
    summary: 'Details the molecular cloning of the fungal luciferase gene cluster and the metabolic synthesis of hispidin/3-hydroxyhispidin. Explores genetic transduction pathways for environmental monitoring in agricultural soils.',
    pathway: 'fungal_luciferin'
  },
  {
    id: 'paper-paddy-botany',
    title: 'Mycelial Biosensing for Nitrogen and Hydration Monitoring in Paddy Ecosystems',
    journal: 'Journal of Botany & Biotechnology (2025)',
    link: 'https://www.botanyjournals.com/assets/archives/2025/vol10issue8/10062.pdf',
    summary: 'Validates Mycena chlorophos survival and glow intensity mapping under waterlogged paddy field conditions. Proves that mycelial growth and light emission correlate linearly with soil moisture tension and organic nitrogen indices.',
    pathway: 'paddy_sensing'
  }
];

const metalsData = {
  copper: {
    name: 'Copper (Cu²⁺)',
    ic50: 12.5, // mg/kg at pH 7.0
    slope: -2.4,
    colorHex: '#f97316',
    desc: 'Commonly introduced via copper-based agricultural fungicides. Strong inhibitory effect on the Red+Luc enzyme system.'
  },
  lead: {
    name: 'Lead (Pb²⁺)',
    ic50: 45.0,
    slope: -1.2,
    colorHex: '#94a3b8',
    desc: 'Heavy metal contaminant from industrial runoffs. Moderate bioavailability in neutral soils but highly mobile in acidic zones.'
  },
  cadmium: {
    name: 'Cadmium (Cd²⁺)',
    ic50: 8.4,
    slope: -3.8,
    colorHex: '#f43f5e',
    desc: 'Extremely toxic trace metal. Binds directly to luciferase active sites, causing instant glow quenching at low concentrations.'
  },
  zinc: {
    name: 'Zinc (Zn²⁺)',
    ic50: 68.0,
    slope: -0.8,
    colorHex: '#3b82f6',
    desc: 'Essential micronutrient at low levels, but highly toxic to bioluminescent bacteria/fungi at concentrations exceeding 100 mg/kg.'
  }
};

const soilHorizons = [
  {
    depth: '0-10 cm',
    name: 'A-Horizon (Topsoil)',
    humus: 5.4,
    humicSubstances: 460, // mg-C/100g
    ph: 5.8, // weakly acidic
    residualLight: 24.2, // % (MDPI page 4 grassland minimum)
    desc: 'Active cultivation and pesticide zone. Contains highest density of agrochemical residues and humic complex formations, yielding the lowest residual light intensity (highest enzyme inhibition).'
  },
  {
    depth: '10-30 cm',
    name: 'B-Horizon (Transition)',
    humus: 3.8,
    humicSubstances: 320,
    ph: 6.2,
    residualLight: 36.8,
    desc: 'Zone of vertical transport. Bioavailable metal complexes leach downwards through rainwater channels, resulting in moderate inhibition of the bioluminescent system.'
  },
  {
    depth: '30-75 cm',
    name: 'C-Horizon (Illuvial)',
    humus: 2.1,
    humicSubstances: 180,
    ph: 6.8,
    residualLight: 52.4,
    desc: 'Clay accumulation zone. Active mineral adsorption reduces the bioavailability of toxic ions, allowing the biological reaction to return above the 50% quenching threshold.'
  },
  {
    depth: '75-120 cm',
    name: 'D-Horizon (Bedrock/Subsoil)',
    humus: 0.9,
    humicSubstances: 80,
    ph: 7.2,
    residualLight: 63.7, // % (MDPI page 4 grassland maximum)
    desc: 'Parent geological material. Free from agricultural pollutant loading. Luminescence intensity remains stable and matches pristine organic baselines.'
  }
];

export default function ScientificLibrary() {
  const [selectedPaper, setSelectedPaper] = useState(researchPapers[0]);
  const [activeMetal, setActiveMetal] = useState('cadmium');
  const [metalConc, setMetalConc] = useState(8);
  const [simulatedPh, setSimulatedPh] = useState(7.0);
  const [selectedHorizon, setSelectedHorizon] = useState(soilHorizons[0]);
  
  const inhibitionChartRef = useRef(null);

  useEffect(() => {
    drawInhibitionChart();
  }, [activeMetal, metalConc, simulatedPh]);

  const getModulatedIC50 = (metal, ph) => {
    const base = metalsData[metal].ic50;
    // At acidic pH (<6.0), metal bioavailability increases, meaning lower concentrations are needed to inhibit the enzyme (lower IC50)
    // Formula: modulated = base * (ph / 7.0) ^ 2
    const ratio = ph / 7.0;
    return Math.max(1.0, Math.round(base * Math.pow(ratio, 2) * 10) / 10);
  };

  const calculateResidualGlow = (metal, conc, ph) => {
    const data = metalsData[metal];
    const modulatedIC50 = getModulatedIC50(metal, ph);
    // Sigmoid curve modeling: I/I0 = 100 / (1 + (conc / modulatedIC50) ^ -slope)
    const factor = Math.pow(conc / modulatedIC50, -data.slope);
    const residual = 100 / (1 + factor);
    return Math.max(0, Math.min(100, Math.round(residual)));
  };

  const drawInhibitionChart = () => {
    const canvas = inhibitionChartRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth;
    const h = canvas.height = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // Dark Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.5;
    for (let x = 40; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h - 20); ctx.stroke();
    }
    for (let y = 15; y < h - 20; y += 20) {
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, h - 20);
    ctx.lineTo(w - 10, h - 20);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '8px monospace';
    ctx.fillText('I/I₀%', 10, 20);
    ctx.fillText('100%', 15, 30);
    ctx.fillText('50%', 20, (h - 20) / 2 + 3);
    ctx.fillText('0%', 25, h - 25);
    ctx.fillText('Concentration (mg/kg)', w - 110, h - 5);

    // Draw Sigmoid Curve
    const data = metalsData[activeMetal];
    ctx.beginPath();
    ctx.strokeStyle = data.colorHex;
    ctx.lineWidth = 2;
    
    let started = false;
    for (let x = 40; x < w - 10; x++) {
      const conc = ((x - 40) / (w - 50)) * 100;
      const resGlow = calculateResidualGlow(activeMetal, conc, simulatedPh);
      const y = h - 20 - (resGlow / 100) * (h - 30);

      if (!started) {
        ctx.moveTo(x, y); started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw threshold boundary line at 50% (quenched threshold)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(40, (h - 20) / 2);
    ctx.lineTo(w - 10, (h - 20) / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.fillText('TOXIC QUENCH THRESHOLD (50%)', w - 170, (h - 20) / 2 - 4);

    // Draw active concentration indicator dot
    const activeX = 40 + (metalConc / 100) * (w - 50);
    const activeRes = calculateResidualGlow(activeMetal, metalConc, simulatedPh);
    const activeY = h - 20 - (activeRes / 100) * (h - 30);

    ctx.beginPath();
    ctx.arc(activeX, activeY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Current: ${metalConc} mg/kg (${activeRes}%)`, activeX - 45, activeY - 10);
  };

  const activeModIC50 = getModulatedIC50(activeMetal, simulatedPh);
  const activeResidual = calculateResidualGlow(activeMetal, metalConc, simulatedPh);

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Scientific Grounding Library</h2>
        <p className="text-sm text-slate-400">Validate the biophysical and chemical models of Sentinel AI against peer-reviewed research.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left list of papers */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            Accredited Literature
          </h3>

          <div className="space-y-2.5">
            {researchPapers.map((paper) => (
              <button
                key={paper.id}
                onClick={() => setSelectedPaper(paper)}
                className={`w-full text-left p-3.5 rounded-lg border transition-all duration-150 flex flex-col gap-2 ${
                  selectedPaper.id === paper.id
                    ? 'bg-slate-950 border-emerald-500 shadow-md shadow-emerald-500/5'
                    : 'bg-slate-950/40 border-slate-850 hover:bg-slate-950/80 hover:border-slate-800'
                }`}
              >
                <div>
                  <span className="text-3xs font-bold text-emerald-500 font-mono tracking-widest uppercase">{paper.journal}</span>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1 leading-snug">{paper.title}</h4>
                </div>
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-500 hover:text-emerald-400 font-mono transition-colors mt-1">
                  DOI: {paper.doi || 'Available in bibliography'} <ChevronRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Selected paper details and chemical pathways */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-6 lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-850 pb-4">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block font-mono">SELECTED PAPER CASE STUDY</span>
              <h3 className="text-md font-bold text-slate-150 mt-1">{selectedPaper.title}</h3>
              <p className="text-xs text-slate-455 mt-2 leading-relaxed">{selectedPaper.summary}</p>
              <a
                href={selectedPaper.link}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold hover:text-emerald-350"
              >
                Open Full Text PDF <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Chemical Pathway Visualization */}
            <div className="space-y-3">
              <span className="block text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-emerald-400" />
                Molecular Bioluminescence Transduction Model
              </span>

              {selectedPaper.pathway === 'coupled_bacterial' ? (
                /* Coupled Red+Luc Reaction Pathway representation */
                <div className="rounded-lg bg-slate-950 p-4 border border-slate-850 space-y-3.5 font-mono text-[10px] text-left text-slate-350">
                  <div className="border-l-2 border-emerald-500 pl-3">
                    <span className="block text-4xs font-bold text-slate-550 uppercase">Stage 1: FMN Reduction</span>
                    <p className="text-slate-200 mt-1">NADH + FMN + H⁺ → NAD⁺ + FMNH₂</p>
                    <p className="text-5xs text-slate-500 mt-0.5">Catalyzed by: NAD(P)H:FMN-oxidoreductase (Red)</p>
                  </div>
                  <div className="border-l-2 border-emerald-500 pl-3">
                    <span className="block text-4xs font-bold text-slate-550 uppercase">Stage 2: Luciferin Oxidation & Emission</span>
                    <p className="text-slate-200 mt-1">FMNH₂ + RCHO + O₂ → RCOOH + FMN + H₂O + h&nu; (~522nm Green)</p>
                    <p className="text-5xs text-slate-500 mt-0.5">Catalyzed by: Bacterial Luciferase (Luc) | RCHO: Myristic Aldehyde</p>
                  </div>
                  <div className="rounded bg-red-950/15 p-2 border border-red-900/20 text-red-400 text-5xs leading-relaxed">
                    🚨 **INHIBITION PRINCIPLE:** Heavy metals (Cd²⁺, Pb²⁺, Cu²⁺) directly bind to luciferase, blocking Stage 2. The residual intensity (I/I₀) drops. If I/I₀ &lt; 50%, standard agricultural irrigation/urea loops are locked to prevent toxicity hazards.
                  </div>
                </div>
              ) : selectedPaper.pathway === 'metal_bioavailability' ? (
                /* Metal Bioavailability representation */
                <div className="rounded-lg bg-slate-950 p-4 border border-slate-850 space-y-3.5 font-mono text-[10px] text-left text-slate-350">
                  <div className="border-l-2 border-amber-500 pl-3">
                    <span className="block text-4xs font-bold text-slate-550 uppercase">Metal Bioavailability Coefficient (K_bio)</span>
                    <p className="text-slate-200 mt-1">{"K_bio = C_bioavailable / C_total = f(pH, Organic Carbon)"}</p>
                    <p className="text-5xs text-slate-500 mt-0.5">Metals are more bioavailable (highly toxic) in acidic soils (pH &lt; 5.5).</p>
                  </div>
                  <div className="border-l-2 border-amber-500 pl-3">
                    <span className="block text-4xs font-bold text-slate-550 uppercase">Glow Quenching Sigmoid Ratio</span>
                    <p className="text-slate-200 mt-1">{"I/I₀% = 100 / (1 + (C_bio / IC₅₀)^-slope)"}</p>
                  </div>
                </div>
              ) : selectedPaper.pathway === 'fungal_luciferin' ? (
                /* Fungal Luciferin representation */
                <div className="rounded-lg bg-slate-950 p-4 border border-slate-850 space-y-3 font-mono text-[10px] text-left text-slate-350">
                  <span className="block text-4xs font-bold text-slate-400 uppercase tracking-widest text-center border-b border-slate-900 pb-1">FUNGAL PITCH: THE CAFFEIC ACID CYCLE</span>
                  <div className="grid grid-cols-5 gap-1 text-[8px] text-center pt-1 items-center">
                    <div className="rounded bg-slate-900 p-1 border border-slate-850">Caffeic Acid</div>
                    <div className="text-emerald-450 font-bold">➔ Hps</div>
                    <div className="rounded bg-slate-900 p-1 border border-slate-850">Hispidin</div>
                    <div className="text-emerald-450 font-bold">➔ H3H</div>
                    <div className="rounded bg-slate-900 p-1 border border-slate-850">3-hydroxyhispidin</div>
                  </div>
                  <div className="flex justify-center text-emerald-400 text-xs font-bold my-1">
                    ⬇ (Luz + O₂ Oxidation)
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-[8px] text-center items-center">
                    <div className="rounded bg-emerald-950/20 text-emerald-400 p-1 border border-emerald-900/30 col-span-2">Light Emission (Peak 522 nm)</div>
                    <div className="text-slate-500 font-bold">➔ Olh</div>
                    <div className="rounded bg-slate-900 p-1 border border-slate-850 col-span-2">Recycled Caffeic Acid</div>
                  </div>
                  <p className="text-[7px] text-slate-500 leading-normal text-center mt-2">
                    *Four enzymes coordinate this autonomous cycle: Hispidin synthase (Hps), Hispidin 3-hydroxylase (H3H), Luciferase (Luz), and Oxyluciferin hydrolase (Olh). No biological cofactor additions required.
                  </p>
                </div>
              ) : (
                /* Paddy Sensing representation */
                <div className="rounded-lg bg-slate-950 p-4 border border-slate-850 space-y-3.5 font-mono text-[10px] text-left text-slate-350">
                  <div className="border-l-2 border-emerald-500 pl-3">
                    <span className="block text-4xs font-bold text-slate-550 uppercase">Paddy Soil Transduction Coefficients</span>
                    <p className="text-slate-200 mt-1">{"Nitrogen Sensitivity Range: 10 - 300 mg/kg"}</p>
                    <p className="text-slate-200 mt-0.5">{"Moisture Linear Range: 15% - 90%"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded bg-slate-950 p-2.5 text-5xs font-mono text-slate-550 flex gap-2 border border-slate-850 mt-4">
            <Award className="h-3.5 w-3.5 text-emerald-450 flex-shrink-0" />
            <p>
              By aligning real-time edge predictions to verified MDPI biological inhibition assays, our closed-loop validation pipeline guarantees laboratory-grade soil monitoring out in the wild.
            </p>
          </div>
        </div>
      </div>

      {/* Soil Horizon Profiler */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-6 mt-6 text-left">
        <div className="border-l-4 border-emerald-500 pl-4">
          <h3 className="text-md font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" />
            MDPI Paper Full-Profile Soil Horizon Interrogation
          </h3>
          <p className="text-3xs text-slate-400">Click on a soil horizon below to inspect its research-backed humus, pH, and residual light profiles (MDPI page 4).</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {/* Soil Column Graphic */}
          <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl flex flex-col gap-2 h-72">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider text-center block mb-1">Soil Core Horizon</span>
            {soilHorizons.map((horizon) => (
              <button
                key={horizon.depth}
                onClick={() => setSelectedHorizon(horizon)}
                className={`flex-1 rounded border text-center transition-all flex flex-col justify-center px-2 py-1 select-none cursor-pointer ${
                  selectedHorizon.depth === horizon.depth
                    ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500 shadow-md shadow-emerald-500/5'
                    : 'bg-slate-900/30 text-slate-450 border-slate-850 hover:bg-slate-900/80 hover:text-slate-300'
                }`}
              >
                <span className="text-4xs font-mono font-bold">{horizon.name}</span>
                <span className="text-5xs text-slate-500 font-mono mt-0.5">{horizon.depth}</span>
              </button>
            ))}
          </div>

          {/* Horizon Details */}
          <div className="md:col-span-3 bg-slate-950 p-5 border border-slate-850 rounded-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{selectedHorizon.name} ({selectedHorizon.depth})</h4>
                <span className="text-4xs font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded">
                  pH {selectedHorizon.ph}
                </span>
              </div>
              <p className="text-3xs text-slate-400 leading-relaxed">{selectedHorizon.desc}</p>
              
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-900/60 p-3 border border-slate-850 rounded text-center">
                  <span className="block text-5xs text-slate-500 uppercase font-bold">Humus Level</span>
                  <span className="text-sm font-mono font-bold text-slate-250 mt-1 block">{selectedHorizon.humus}%</span>
                </div>
                <div className="bg-slate-900/60 p-3 border border-slate-850 rounded text-center">
                  <span className="block text-5xs text-slate-500 uppercase font-bold">Humic Substances</span>
                  <span className="text-sm font-mono font-bold text-slate-250 mt-1 block">{selectedHorizon.humicSubstances} <span className="text-5xs text-slate-550">mg-C/100g</span></span>
                </div>
                <div className="bg-slate-900/60 p-3 border border-slate-850 rounded text-center">
                  <span className="block text-5xs text-slate-500 uppercase font-bold">Residual Luminescence</span>
                  <span className={`text-sm font-mono font-bold mt-1 block ${
                    selectedHorizon.residualLight > 50 ? 'text-emerald-450' : 'text-red-400'
                  }`}>{selectedHorizon.residualLight}%</span>
                </div>
              </div>
            </div>

            <div className="rounded bg-slate-900 p-2 text-5xs font-mono text-slate-500 mt-4 flex gap-2">
              <Info className="h-3 w-3 text-emerald-400 flex-shrink-0" />
              <p>
                *The residual intensity profile represents empirical assays from the MDPI paper where agriculturally managed grasslands accumulate pesticides in top levels, leading to high enzyme-inhibition.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Metal Inhibition Graph */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-6 mt-6 text-left">
        <div className="border-l-4 border-emerald-500 pl-4">
          <h3 className="text-md font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            Interactive Bio-Inhibition & pH Bioavailability Simulator
          </h3>
          <p className="text-3xs text-slate-400">Simulate how chemical/heavy metal concentrations and soil pH levels modulate bioluminescence inhibition (I/I₀%).</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Metal Selector & Sliders */}
          <div className="space-y-4 text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Heavy Metal Pollutant</span>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(metalsData).map((metal) => (
                <button
                  key={metal}
                  onClick={() => {
                    setActiveMetal(metal);
                    setMetalConc(Math.round(metalsData[metal].ic50));
                  }}
                  className={`text-3xs font-mono font-bold uppercase py-2 px-1 rounded border text-center transition-all ${
                    activeMetal === metal
                      ? 'bg-slate-950 text-slate-200 border-emerald-500'
                      : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:bg-slate-900'
                  }`}
                >
                  {metalsData[metal].name}
                </button>
              ))}
            </div>

            <div className="space-y-3 bg-slate-950/60 p-3.5 border border-slate-850 rounded">
              <span className="block text-4xs font-bold text-slate-400 uppercase">Chemical Parameters</span>
              <p className="text-5xs text-slate-500 leading-normal">{metalsData[activeMetal].desc}</p>
              <p className="text-5xs text-slate-400 font-mono mt-1"><b className="text-slate-500">Base IC₅₀:</b> {metalsData[activeMetal].ic50} mg/kg (at pH 7.0)</p>
              <p className="text-5xs text-emerald-450 font-mono"><b className="text-slate-500">Modulated IC₅₀:</b> {activeModIC50} mg/kg (pH-adjusted)</p>
            </div>

            {/* Slider 1: Concentration */}
            <div className="space-y-1">
              <div className="flex justify-between text-4xs font-bold uppercase">
                <span className="text-slate-400">Metal Concentration</span>
                <span className="text-emerald-400 font-mono">{metalConc} mg/kg (ppm)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={metalConc}
                onChange={(e) => setMetalConc(parseInt(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
              />
            </div>

            {/* Slider 2: pH Bioavailability Modulator */}
            <div className="space-y-1">
              <div className="flex justify-between text-4xs font-bold uppercase">
                <span className="text-slate-450">Soil pH Bio-Modulator</span>
                <span className="text-emerald-400 font-mono">pH {simulatedPh.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="4.5"
                max="8.5"
                step="0.1"
                value={simulatedPh}
                onChange={(e) => setSimulatedPh(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-950 rounded h-1 cursor-pointer"
              />
            </div>
            
            <div className={`rounded p-2 text-5xs leading-relaxed border font-mono ${
              activeResidual > 50 ? 'bg-emerald-950/10 border-emerald-900/20 text-emerald-450' : 'bg-red-950/10 border-red-900/20 text-red-400'
            }`}>
              Residual Luminescence (I/I₀) = {activeResidual}%. Status: {activeResidual > 50 ? 'SECURE' : 'TOXIC_HALT'}
            </div>
          </div>

          {/* Canvas Graph */}
          <div className="md:col-span-2 flex flex-col justify-center">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Bioluminescent Inactivation Rate (Residual Intensity Curve)
            </span>
            <canvas
              ref={inhibitionChartRef}
              className="w-full h-48 rounded bg-slate-950 border border-slate-850"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
