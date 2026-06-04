<script setup>
import { ref, onMounted, onUnmounted, nextTick, h } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
//引入性能监视器stats.js
import Stats from 'three/addons/libs/stats.module.js'
// 引入dat.gui.js的一个类GUI
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { GLTFLoader, DRACOLoader } from 'three/examples/jsm/Addons.js'
// import { MapControls } from 'three/addons/controls/mapControls.js'; // 相机控件
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
// import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js'
// import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
// import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js'

// FXAA抗锯齿Shader
// import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'
// SMAA抗锯齿通道
// import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js'

import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'
// import { ViewHelper } from 'three/addons/helpers/ViewHelper.js'

import sphereBack from '@/assets/img/sphereBack.jpg'

// import {VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js'
// import { saturation } from 'three/tsl'
// import {VertexNormalsHelper } from 'three/addons/libs/helpers/VertexNormalsHelper.js'

import PileInfo from './PileInfo.vue'

let container, camera, scene, renderer, envMap
let outlinePass, composer, raycaster, css3Renderer, meshes = []
// let css2Renderer
// const loadManager = new THREE.LoadingManager()

onMounted(() => {
  console.log('查看当前屏幕设备像素比', window.devicePixelRatio)
  container = document.getElementById('canvasContainer')

  init()
 
  window.addEventListener('resize', () => {
    const width = container.clientWidth
    const height = container.clientHeight

    // 解决背景图变形
    envMapResize(width, height, envMap)

    // 重置渲染器输出画布canvas尺寸: style中设置的width和height，
    // canvas的width和height属性可能和style的不一样，但是比值一样
    renderer.setSize(width, height)
    css3Renderer.setSize(width, height)

    // 全屏情况下：设置观察范围长宽比aspect为窗口宽高比
    camera.aspect = width / height    
    // 渲染器执行render方法的时候会读取相机对象的投影矩阵属性projectionMatrix
    // 但是不会每渲染一帧，就通过相机的属性计算投影矩阵(节约计算资源)
    // 如果相机的一些属性发生了变化，需要执行updateProjectionMatrix ()方法更新相机的投影矩阵
    camera.updateProjectionMatrix()
  })  
})

onUnmounted(() => {
  orbitControls?.dispose()
  renderer?.dispose()
  scene?.clear()
})

function envMapResize(width, height, envMap) {
  // 解决背景图变形
  if (envMap) {
    const canvasAspect = width / height  //第1步：计算出画布宽高比  
    const imgAspect = envMap.width / envMap.height  //第2步：计算出背景图宽高比
    const resultAspect = imgAspect / canvasAspect  //第3步：计算出最终背景图宽缩放宽高比

    // 第4步：设置背景图纹理的偏移和重复
    envMap.offset.x = resultAspect > 1 ? (1 - 1 / resultAspect) / 2 : 0
    envMap.repeat.x = resultAspect > 1 ? 1 / resultAspect : 1
    envMap.offset.y = resultAspect > 1 ? 0 : (1 - resultAspect) / 2
    envMap.repeat.y = resultAspect > 1 ? 1 : resultAspect
  }
}

function init() {
  const container = document.getElementById('canvasContainer')

  // 1. 相机
  const aspect = container.clientWidth / container.clientHeight
  camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 2000)

  // const k = container.clientWidth / container.clientHeight
  // const s = 0.5; //控制left, right, top, bottom范围大小
  // camera = new THREE.OrthographicCamera(-s * k, s * k, s, -s, 1, 8000)
  
  // camera.position.set(0, 0, 0)  
  // camera.position.set(-200, 150, 600) // 45
  camera.position.set(-220, 150, 800)

  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()

  // 2. 场景
  scene = new THREE.Scene()

  // 3. 渲染器，并将其渲染后的canvas元素添加到页面中  
  renderer = new THREE.WebGLRenderer({
    // 指定渲染器输出的canvas元素，或：container.appendChild(renderer.domElement)
    canvas: container.appendChild(document.createElement('canvas')),
    antialias: true, //开启抗锯齿
    // clearColor: 0xFFFFFF, //设置背景颜色
  })
   
  renderer.setSize(container.clientWidth, container.clientHeight)
  // 获取屏幕对应的设备像素比.devicePixelRatio，告诉threejs，以免渲染模糊问题
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setClearColor(0xFFFFFF, 1) //设置背景颜色和透明度
  
  renderer.shadowMap.enabled = true
  renderer.domElement.setAttribute('aria-label', '3D新能源汽车充电站展示') // 屏幕阅读器
  renderer.domElement.setAttribute('tabindex', '0') // 键盘tab键访问

  // 可访问性：屏幕阅读器描述
  const sceneDesc = document.createElement('div')
  sceneDesc.id = 'scene-desc'
  sceneDesc.className = 'sr-only'
  sceneDesc.setAttribute('aria-live', 'polite') // 当内容发生变化时，屏幕阅读器告诉用户
  sceneDesc.textContent = '3D新能源汽车充电站展示已加载'
  document.body.appendChild(sceneDesc)

  renderer.domElement.addEventListener('click', onClickHandler)  

  // 4. 处理渲染后期
  composer = new EffectComposer(renderer)
  // 4.1 创建一个渲染器通道：指定后处理对应的相机camera和场景scene
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)
  
  // 4.2 OutlinePass可以给指定的某个模型对象添加一个高亮发光描边效果
  // OutlinePass第一个参数v2的尺寸和canvas画布保持一致
  const v2 = new THREE.Vector2(container.clientWidth, container.clientHeight)
  outlinePass = new OutlinePass(v2, scene, camera)
  outlinePass.visibleEdgeColor.set(0x00d3f3) // 0x1bd921
  //高亮发光描边厚度
  outlinePass.edgeThickness = 4
  //高亮描边发光强度
  outlinePass.edgeStrength = 6
  //模型闪烁频率控制，默认0不闪烁
  outlinePass.pulsePeriod = 2
  // 设置OutlinePass通道
  composer.addPass(outlinePass)
  
  // renderer.autoClear = false
  // const bloomPass = new UnrealBloomPass(v2, 1.5, 0.4, 0.85)
  // bloomPass.strength = 2.0
  // composer.renderToScreen = true
  // bloomPass.clearColor = 0xFF0000
  // composer.addPass(bloomPass) // 问题：白屏

  // const glitchPass = new GlitchPass()
  // 设置glitchPass通道
  // composer.addPass(glitchPass)

  // // 创建伽马校正通道
  // const gammaPass= new ShaderPass(GammaCorrectionShader)
  // composer.addPass(gammaPass)

  // width、height是canva画布的宽高度
  // const smaaPass = new SMAAPass(container.clientWidth * pixelRatio, container.clientHeight * pixelRatio);
  // composer.addPass(smaaPass)

  // 将色调映射和颜色空间转换纳入您的处理链中。在大多数情况下，此处理应包含在每个处理链的末尾。
  // 如果某个处理需要sRGB输入（例如FXAA），则该处理必须在处理链中紧随OutputPass之后
  const outputPass = new OutputPass()
  composer.addPass(outputPass)
  
  // const pixelRatio = renderer.getPixelRatio();//获取设备像素比 
  // const FXAAPass = new ShaderPass( FXAAShader );
  // // `.getPixelRatio()`获取`renderer.setPixelRatio()`设置的值  
  // // width、height是canva画布的宽高度
  // FXAAPass.uniforms.resolution.value.x = 1 /(container.clientWidth * pixelRatio);
  // FXAAPass.uniforms.resolution.value.y = 1 /(container.clientHeight * pixelRatio);
  // composer.addPass( FXAAPass )

  // renderer.setAnimationLoop(animate) //设置渲染循环，参数是一个函数，在每一帧执行

  // css2Renderer = css2DRender(container.clientWidth, container.clientHeight)
  css3Renderer = createCss3DRenderer(container.clientWidth, container.clientHeight, container)

  // 添加辅助工具
  addHelpers()
  // 添加光源
  // addPointLight()
  addDirectionalLight(scene)
  addAmbientLight(scene)
  // addSpotLight() 

  addObject()
  loadEnvMap()
  animate()  
}

let choseObj = null
let tags = new Map() // 存储已创建的标签，避免重复创建

function onClickHandler(event) {
  console.log('射线器返meshes:', meshes)
  // .offsetY、.offsetX以canvas画布左上角为坐标原点,单位px
  const px = event.offsetX
  const py = event.offsetY
  // 屏幕坐标px、py转WebGL标准设备坐标x、y
  // width、height表示canvas画布宽高度
  const x = (px / container.clientWidth) * 2 - 1
  const y = -(py / container.clientHeight) * 2 + 1

  //创建一个射线投射器`Raycaster`
  raycaster = new THREE.Raycaster()
  // 计算射线投射器`Raycaster`的射线属性.ray
  // 形象点说就是在点击位置创建一条射线，射线穿过的模型代表选中
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
  //.intersectObjects([mesh1, mesh2, mesh3])对参数中的网格模型对象进行射线交叉计算
  // 未选中对象返回空数组[],选中一个对象，数组1个元素，选中两个对象，数组两个元素
  const intersects = raycaster.intersectObjects(meshes)
  console.log('射线器返回的对象:', intersects)
  // intersects.length大于0说明，说明选中了模型
  if (intersects.length > 0) {
    // 桩的子模型枪gun和screen，又都分别有子模型
    // blender创建的模型不同材质的部分，转换成gltf后，可能是不同的mesh
    // 因此相交中模型的直接parent不一定是桩，用直接parent的name查找，有可能找不到对应的id的div    
    // 第一个是最近的
    let parent = intersects[0].object.parent
    let id = parent.name
    console.log('id-1:', id)
    if(id.includes('gun') || id.includes('screen')) {
      parent = parent.parent
      id = parent.name      
    }
    console.log('id-2:', id)
    
    if(!choseObj || choseObj.name !== id) {
      let tag
      if(!tags.has(id)) {
        tag = createCss3DObj(id, { x: 0, y: 0, z: parent.position.z + 10 })
        tags.set(id, tag) // 创建的scss3dObject对象存储到tags中，避免重复创建；后面关闭/移除时也会用到
      } else {
        tag = tags.get(id)   
      }     
      
      parent.add(tag)
      // 移除上一个标签
      choseObj && choseObj.remove(tags.get(choseObj.name))
      choseObj = parent
      outlinePass.selectedObjects = [parent]
    }
  } 
}

async function loadEnvMap() {
  envMap = await loadTexture(sphereBack)
  scene.environment = envMap
  scene.background = envMap
  envMapResize(container.clientWidth, container.clientHeight, envMap)
}

function css2DRender(width, height) {
  // 创建一个CSS2渲染器CSS2DRenderer
  const css2Renderer = new CSS2DRenderer()
  css2Renderer.setSize(width, height)
  // HTML标签<div id="tag"></div>外面父元素叠加到canvas画布上且重合
  css2Renderer.domElement.style.position = 'absolute'
  css2Renderer.domElement.style.top = '0px'
  //设置.pointerEvents=none，解决HTML元素标签对threejs canvas画布鼠标事件的遮挡
  css2Renderer.domElement.style.pointerEvents = 'none' 

  container.appendChild(css2Renderer.domElement)
  return css2Renderer
}

function createCss3DRenderer(width, height, container) {
  // 创建一个CSS3渲染器CSS3DRenderer
  const css3Renderer = new CSS3DRenderer()
  css3Renderer.setSize(width, height)
  // HTML标签<div id="tag"></div>外面父元素叠加到canvas画布上且重合
  css3Renderer.domElement.style.position = 'absolute'
  css3Renderer.domElement.style.top = '0px'
  //设置.pointerEvents=none，解决HTML元素标签对threejs canvas画布鼠标事件的遮挡
  css3Renderer.domElement.style.pointerEvents = 'none'
  container.appendChild(css3Renderer.domElement)
  return css3Renderer
}

function createCss3DObj(id, { x = 0, y = 0, z = 0 } = {}) {
  const div = document.getElementById(id)
  console.log('createCss3DObj div:', div, pilesInfo.value.find(item => item.id === id))
  div.style.pointerEvents = 'none'
  // 页面加载时
  div.style.display = 'block'

  // HTML元素转化为threejs的CSS3模型对象
  const tag = new CSS3DObject(div)
  //标签tag作为mesh子对象，默认标注在模型局部坐标系坐标原点

  // tag的局部坐标
  tag.position.x = x
  tag.position.y = y
  tag.position.z = z
  tag.rotation.set(Math.PI / 2, Math.PI, 0) // 标签默认朝向是z轴正方向，旋转后朝向y轴正方向
  return tag
}

function animate() {
  // const spt = timer.getDelta() * 1000 //毫秒
  // console.log('两帧渲染时间间隔(毫秒)',spt)
  // console.log('帧率FPS', 1000/spt)  
  // timer.update(timestamp) // timestamp is optional

  if (stats) stats.update()
  // 实现周期性循环执行
  // 默认每秒钟执行60次，但不一定能做到，要看代码的性能
  // requestAnimationFrame(animate) // renderer.setAnimationLoop(animate)时不用 

  // orbitControls.autoRotate设置为true，必须在此调用update
  // if(orbitControls) orbitControls.update()
  
  css3Renderer.render(scene, camera)
  // renderer.autoClear = false
  // renderer.clearDepth()
  composer.render()

  requestAnimationFrame(animate)
  // renderer.render(scene, camera)
}

/* 添加辅助工具 */
function addHelpers() {
  // 辅助坐标轴 
  // addAxesHelper(300)
  // addGridHelper()  
  addOrbitControls()
  // addMapControls()  
  addStats()
  // addGUI()
  // const viewHelper = new ViewHelper(camera, renderer.domElement)
  // scene.add(viewHelper)
}

let orbitControls
// 辅助坐标轴
function addOrbitControls() {
  orbitControls = new OrbitControls(camera, renderer.domElement)
  // 控制前后旋转范围：.maxPolarAngle属性设置为90度，这样不能看到模型底部
  orbitControls.maxPolarAngle = Math.PI / 2
  // 控制左右旋转范围
  // orbitControls.minAzimuthAngle = -Math.PI/2
  // orbitControls.maxAzimuthAngle = Math.PI/2
  // orbitControls.autoRotate = true 
  
  // 如果OrbitControls改变了相机参数，重新调用渲染器渲染三维场景
  // 因为设置了渲染循环animate,
  // 相机控件OrbitControls就不用再通过事件change执行renderer.render(scene, camera)
  // //监听鼠标、键盘事件
  orbitControls.addEventListener('change', function (event) {
    // console.log('OrbitControls change event', event)
    // renderer.render(scene, camera) //执行渲染操作
    // console.log('camera.position',camera.position)
    // console.log('controls.target',orbitControls.target)
  })
}

// 与轨道控制类似，但是鼠标操作正好相反：左平移，右旋转
function addMapControls() {
  const controls = new MapControls(camera, renderer.domElement)
  controls.addEventListener('change', function () {
    // 鼠标右键旋转时候，查看.position变化
    // 鼠标左键拖动的时候，查看.position、.target的位置会变化
    console.log('camera.position',camera.position)
    console.log('controls.target',controls.target)
  })
}

// 光源辅助观察
function addPointLightHelper(pointLight) {
  const pointLightHelper = new THREE.PointLightHelper(pointLight, 10)
  scene.add(pointLightHelper) 
}

function addDirectionalLightHelper(directionalLight, size) {
  const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, size)  
  // 可视化平行光阴影对应的正投影相机对象
  const cameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
  // scene.add(cameraHelper)
  scene.add(directionalLightHelper, cameraHelper)
}

// 轨道控制器
function addAxesHelper(length = 1) {
  const axesHelper = new THREE.AxesHelper(length)
  scene.add(axesHelper)
}

function addGridHelper() {
  const gridHelper = new THREE.GridHelper(800, 25, 0x004444, 0x004444)
  scene.add(gridHelper)
}

let  stats
// 性能监测
function addStats() {  
  stats = new Stats()
  // stats.domElement显示：渲染帧率: 刷新频率,一秒渲染次数
  // stats.setMode(0) //默认模式
  //stats.domElement显示：渲染周期: 渲染一帧多长时间(单位：毫秒ms)
  // stats.setMode(1)
  container.appendChild(stats.dom) 
}

let gui
// 创建GUI界面
function addGUI() {
  gui = new GUI()
  //改变交互界面style属性
  console.log(gui.domElement.style)
  // gui.domElement.style.background = '#CCCCCC'
  // gui.domElement.style.right = '0px'
  // gui.domElement.style.width = '300px'
  // console.log(gui.domElement.style)
  if(gui) {
    const cameraFolder = gui.addFolder('相机位置')
    cameraFolder.add(camera.position, 'x', -800, 800).name('X')
    cameraFolder.add(camera.position, 'z', -800, 800).name('Z')
    cameraFolder.add(camera.position, 'y', -800, 800).name('Y') 
    cameraFolder.close()

    const targetCotrols = {
      x: 0,
      y: 0,
      z: 0,
      updateTarget: function () {
        console.log('updateTarget', orbitControls.target, this.x, this.y, this.z)
        orbitControls.target = new THREE.Vector3(this.x, this.y, this.z)
        orbitControls.update()
        console.log(orbitControls.target)
      }
    }
  
    const cameraLooKFolder = gui.addFolder('相机观察点')
    cameraLooKFolder.add(targetCotrols, 'x', -800, 800).name('X').onChange(() => targetCotrols.updateTarget())
    cameraLooKFolder.add(targetCotrols, 'z', -800, 800).name('Z').onChange(() => targetCotrols.updateTarget())
    cameraLooKFolder.add(targetCotrols, 'y', -800, 800).name('Y').onChange(() => targetCotrols.updateTarget())
    cameraLooKFolder.close()
  }

}


// 光源
// 1点光源
function addPointLight() {
  const light = new THREE.PointLight(0xffffff, 1, 0)
  light.position.set(0, 200, 0)
  addPointLightHelper(light)
  if(gui) {
    const pointFolder = gui.addFolder('点光源')
    const posFolder = pointFolder.addFolder('位置')
    posFolder.add(light.position, 'x', -600, 600).name('X')
    posFolder.add(light.position, 'z', -600, 600).name('Z')
    posFolder.add(light.position, 'y', -600, 600).name('Y')
  }
  scene.add(light)  
}

let directionalLight
// 2、平行光
function addDirectionalLight(scene) {
  directionalLight = new THREE.DirectionalLight(0xffffff, 2)
  directionalLight.position.set(400, 400, 400)

  directionalLight.castShadow = true
  directionalLight.shadow.camera.left = -500
  directionalLight.shadow.camera.right = 500
  directionalLight.shadow.camera.top = 500
  directionalLight.shadow.camera.bottom = -500
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 2000
  // addDirectionalLightHelper(directionalLight, 200)
  // const cameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
  // scene.add(cameraHelper)
  scene.add(directionalLight)
}

// 3、环境光
function addAmbientLight(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 1)
  scene.add(ambientLight)
}

// 4、聚光灯
// function addSpotLight(scene) {
//   const spotLight = new THREE.SpotLight(0xffffff, 1)
//   spotLight.position.set(5, 10, 0)
//   scene.add(spotLight)
// }

// 在场景中添加物体
function addObject() {  
  loadChargeSationModels()
  // composer.addPass(outlinePass)
}

// 纹理加载
async function loadTexture(url, loadManager) {
  const loader = loadManager ? new THREE.TextureLoader(loadManager) : new THREE.TextureLoader()
  // const tex = loader.load(url, (tex) => {
  //   console.log('onload tex:', tex.image, tex.image.width)
  // })
  const tex = await loader.loadAsync(url)
  tex.colorSpace = THREE.SRGBColorSpace
  console.log({ tex }, tex.image)
  return tex
}

function loadCubeTexture(paths, callback, basePath) {
  const cubeLoader = new THREE.CubeTextureLoader()
  if(basePath) cubeLoader.setPath(basePath)
  cubeLoader.load(paths, (gltf) => {
    callback(gltf)
  })
}

const progress = ref(0)
const loading = ref(true)
const pilesInfo = ref([
  { id: 'pile1', title: '桩1', pileNo: '0001', status: '待机中', show: false },
  { id: 'pile2', title: '桩2', pileNo: '0002', status: '已连接', show: false },
  { id: 'pile3', title: '桩3', pileNo: '0003', status: '待机中', show: false },
  { id: 'pile4', title: '桩4', pileNo: '0004', status: '待机中', show: false },
  { id: 'pile5', title: '桩5', pileNo: '0005', status: '待机中', show: false },
  { id: 'pile6', title: '桩6', pileNo: '0006', status: '待机中', show: false },
])

function loadChargeSationModels() {
  const url = './three/new_energy_vehicle_charging_station.glb'
  const onProgress = (val) => {
    // console.log(`GLTF加载进度：${val}`)
    progress.value = val
  }
  loading.value = true

  loadModels(url, (gltf) => {
    // console.log(gltf)
    const model = gltf.scene
    model.position.set(0, 0, 0)

    // // 创建包围盒并计算尺寸
    // const box = new THREE.Box3().setFromObject(model)
    // const cent = box.getCenter(new THREE.Vector3())
    // const size = box.getSize(new THREE.Vector3())
    
    // //Rescale the object to normalized space
    // var maxAxis = Math.max(size.x, size.y, size.z)
    // model.scale.multiplyScalar(1.0 / maxAxis)
    // box.setFromObject(model)
    // box.getCenter(cent)
    // box.getSize(size)
    // //Reposition to 0,halfY,0
    // model.position.copy(cent).multiplyScalar(-1)
    // model.position.y -= (size.y * 0.5)
    
    model.children[0].traverse((child) => {
      if(child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
      
      // 桩的子模型枪gun和screen，又都分别有子模型
      if(child.isGroup) {
        if(child.name.includes('pile')) {
          // console.log('child:', child.getWorldPosition(new THREE.Vector3()), child)
          // // const css3Obj = 
          // 注意：blender的z轴垂直向上，threejs的y轴垂直向上
          // createCss3DObj(child.name, child, { x: 0, y: 0, z: child.position.z })
          meshes.push(child)
        }
        // receiveShadow
        if(child.name === 'ground') {
          console.log(child)
          child.receiveShadow = true
        }
      }
    })
    loading.value = false
    scene.add(model)    
  
  }, onProgress) 
}

// gltf要放到public文件夹里
// 纹理文件需与模型文件在同一目录或正确指定路径
function loadModels(url, callback, onProgress, draco = false) {
  const loader = new GLTFLoader()
  if(draco) {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath( 'three/examples/jsm/libs/draco/' )
    loader.setDRACOLoader( dracoLoader )
  }
  
  loader.load(url, (gltf) => {console.log(gltf)
    callback(gltf)
  }, (progerss) => {  
    const progress = Math.floor(progerss.loaded / progerss.total * 100)
    onProgress(progress)
  }, (error) => {
    console.log(`GLTF加载错误：${error}`)
  })
}

// 关闭标签
const closeTag = (id) => {
  if(choseObj) {
    choseObj.remove(tags.get(id))
    choseObj = null
    outlinePass.selectedObjects = []
  }
}

</script>

<template> 
  <div class="h-full">
    <div id="canvasContainer" class="min-h-screen"></div>

    <div v-if="loading" class="fixed top-0 left-0 right-0 bottom-0 bg-white/65">
      <label for="progress-bar" class="w-1/2 md:max-w-96 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
        <progress
          id="progress-bar"
          class="grow-1 appearance-none h-[8px] border-none bg-[#e0e0e0] rounded-[4px]" 
          max="100" 
          :value="progress"
        ></progress>
        {{ progress }}%
      </label>
    </div> 
    <!-- 首次加载时要隐藏，将display设置为none。当添加到场景时设置为block，添加后就会从初始渲染位置移动到添加的位置 -->
    <PileInfo
      v-for="info of pilesInfo" 
      :key="info.id"
      :id="info.id"        
      :title="info.title"
      :pile-no="info.pileNo"
      :status="info.status"
      style="display: none"
      @close="closeTag(info.id)"
    />

    <div class="absolute bottom-4 left-0 right-0 text-center text-sm text-gray-500">
      "New energy vehicle charging station - 新能源车充电站" (https://skfb.ly/pq7EV) by MrdT is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
    </div>
  </div>
</template>

<style scoped>
/* WebKit */
progress::-webkit-progress-bar {
  background: #e0e0e0; 
  border-radius: 4px;  
}
progress::-webkit-progress-value {
  border-radius: 4px;
  background: #2b7fff;
  transition: width 0.3s ease;
}

/* Firefox */
progress::-moz-progress-bar {
  border-radius: 4px;
  background: #2b7fff;
}
</style>
