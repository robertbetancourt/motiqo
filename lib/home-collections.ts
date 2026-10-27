import {elements,type ElementId} from './catalog';

// Editorial selections, independent of popularity or save counts.
const select=(ids:readonly ElementId[])=>ids.map(id=>elements.find(element=>element.id===id)!);
export const homeCollections=[
  {id:'motiqo-ten',title:'The Motiqo 10',ranked:true,items:select([
    'thermal-smoke','sacred-lotus','orbit-stage-hero','liquid-artifact-hero','atelier','companion','optical-artifact-card','inkshift','radial-spectrum','water-ripple-carousel',
  ])},
  {id:'fresh-perspectives',title:'Fresh perspectives',ranked:false,items:select([
    'iris-turbine','bokeh-terrain','orbit-agent','type-garden','aperture-carousel','charge',
  ])},
  {id:'made-to-react',title:'Made to react',ranked:false,items:select([
    'gyro','drawer','lantern','arbor','lenticular-button','glow-nav',
  ])},
];
export const homeTopics=[
  {tag:'Three.js',title:'Built in 3D',description:'Objects with another dimension.'},
  {tag:'Typography',title:'A way with words',description:'Type that has something to say.'},
  {tag:'Interactive',title:'A human touch',description:'Details that respond to you.'},
  {tag:'Glass',title:'Through the looking glass',description:'Light, layers and a little refraction.'},
].map(topic=>({...topic,count:elements.filter(element=>element.tags.includes(topic.tag)).length}));
