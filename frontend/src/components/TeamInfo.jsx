import React from 'react';
import { Shield, Code, Database, Eye } from 'lucide-react';

const members = [
  {
    name: 'Shivanesh V',
    role: 'Team Lead & AI/ML Architect',
    skills: ['Python', 'Node.js', 'AI/ML Architecture', 'Deep Learning'],
    icon: Shield,
    color: 'from-emerald-500 to-green-600'
  },
  {
    name: 'Venkataraam VG',
    role: 'Frontend Lead & UI/UX Designer',
    skills: ['React', 'Tailwind CSS', 'Frontend Engineering', 'UX Prototyping'],
    icon: Code,
    color: 'from-cyan-400 to-blue-500'
  },
  {
    name: 'Ragavendra M',
    role: 'Backend & Cloud Deployment Engineer',
    skills: ['SQL/MySQL', 'Node.js', 'Express API', 'Cloud Infrastructure'],
    icon: Database,
    color: 'from-purple-500 to-indigo-600'
  },
  {
    name: 'Ashwin M',
    role: 'Computer Vision Engineer',
    skills: ['Python', 'OpenCV', 'Image Processing', 'Feature Extraction'],
    icon: Eye,
    color: 'from-yellow-500 to-orange-600'
  }
];

export default function TeamInfo() {
  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Vita-Core Systems</h2>
        <p className="text-sm text-slate-400">The engineering team behind the bioluminescent mycelial sensor pipeline.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {members.map((member, idx) => {
          const Icon = member.icon;
          return (
            <div 
              key={idx}
              className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5"
            >
              {/* Decorative background glow */}
              <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl transition-all duration-500 group-hover:bg-emerald-500/10" />

              <div className="flex items-start gap-4">
                <div className={`rounded-lg bg-gradient-to-br ${member.color} p-3 text-slate-950 shadow-md`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors duration-200">
                      {member.name}
                    </h3>
                    <p className="text-xs font-medium text-emerald-500/80">{member.role}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {member.skills.map((skill, sIdx) => (
                      <span 
                        key={sIdx}
                        className="inline-flex items-center rounded-md bg-slate-950 px-2 py-1 text-2xs font-medium text-slate-300 border border-slate-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compliance Notice for Judges */}
      <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-4 text-xs text-slate-500">
        <p className="leading-relaxed">
          ⚠️ **BLIND JUDGING COMPLIANCE:** In accordance with Biothon Round 2 regulations, all institutional, geographic, and regional affiliations have been omitted from this application interface.
        </p>
      </div>
    </div>
  );
}
