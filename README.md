# General Information
This web application is a 3D model viewer made with WebGL2.
I made it using my knowledge from computer graphics lectures as well as
reading through the very insightful free online book https://learnopengl.com/ by Joey de Vries.

# Features and Limitations
- In the renderer there are different predefinied models and environment maps selectible.
- You can upload your own 3D models, but only the fileformat `.glb` is supported currently.
- The renderer only supports fully opaque models. Models that contain glass or other transparent materials will not work.
- IBL (Image based Lighting) should work on Desktop, but might produce glossy results depending on the mobile implementation of WebGL2. If models look to glossy disable this feature.
- To read more about the different features including explanations and examples refer to the about page in the website

# Compilation and Running (Tested for Windows)
1. Make sure you have NodeJS installed. If not download it at https://nodejs.org/en/download
2. At the root of the project run `npm update`
3. **Running**: run `vite run dev`
4. **Building**: run `vite run build`
