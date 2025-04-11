import '../css/style.css';

export const executeScript = () => {
  /* START JQUERY KNOB */
  $('.knob').knob({
    readOnly: true,//if true This will Set the Knob readonly cannot click
  })
  /* END JQUERY KNOB */
}