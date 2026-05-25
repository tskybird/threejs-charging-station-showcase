<script setup>
import { ref, nextTick, onMounted, onUnmounted, useTemplateRef, watchEffect } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
//引入性能监视器stats.js
import Stats from 'three/addons/libs/stats.module.js'
// 引入dat.gui.js的一个类GUI
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { GLTFLoader, DRACOLoader } from 'three/examples/jsm/Addons.js'
import { MapControls } from 'three/addons/controls/mapControls.js'; // 相机控件
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
// 引入渲染器通道RenderPass
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
// 引入OutlinePass通道
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
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js'

// import monkeyUrl from  '@/assets/three/monkey.glb'
// import monkeyUrl2 from '@/assets/three/monkey.gltf'
import sphereBack from '@/assets/img/sphereBack.jpg'

import {VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js'
import { saturation } from 'three/tsl'
// import {VertexNormalsHelper } from 'three/addons/libs/helpers/VertexNormalsHelper.js'


let container, camera, scene, renderer, envMap
let outlinePass, composer, raycaster, css2Renderer, meshs = []
const loadManager = new THREE.LoadingManager()


onMounted(() => {
  console.log('查看当前屏幕设备像素比', window.devicePixelRatio)
  container = document.getElementById('canvasContainer')

  init()
  console.log('888888888:', renderer.domElement.width, renderer.domElement.height)

  // TODO: 确认是否生效
  // onresize 事件会在窗口被调整大小时发生
  // <canvas data-engine="three.js r184" width="818" height="868" aria-label="3D新能源汽车充电站展示" tabindex="0" style="width: 655px; height: 695px; touch-action: none;"></canvas>
  window.addEventListener('resize', () => {
    console.log('container.clientWidth:', container.clientWidth, 'container.clientWidth:', container.clientHeight)
    const a = document.getElementById('canvasContainer')
    console.log(a.clientWidth, a.clientHeight)
    console.log('window.devicePixelRatio:',window.devicePixelRatio, '.getPixelRatio', renderer.getPixelRatio(), renderer.getCurrentViewport(new THREE.Vector2()))
    // window.onresize = function () {
      // const container = document.getElementById('canvasContainer')
      const width = container.clientWidth
      const height = container.clientHeight

      // 解决背景图变形
      envMapResize(width, height)

      // 重置渲染器输出画布canvas尺寸: style中设置的width和height，
      // canvas的width和height属性可能和style的不一样，但是比值一样
      renderer.setSize(width, height)
      // 全屏情况下：设置观察范围长宽比aspect为窗口宽高比
      camera.aspect = width / height    
      // 渲染器执行render方法的时候会读取相机对象的投影矩阵属性projectionMatrix
      // 但是不会每渲染一帧，就通过相机的属性计算投影矩阵(节约计算资源)
      // 如果相机的一些属性发生了变化，需要执行updateProjectionMatrix ()方法更新相机的投影矩阵
      camera.updateProjectionMatrix()
      
      

      // if (!envMap) {
      //   const canvasAspect = width / height  //第1步：计算出画布宽高比
      //   // const bgTexture = textureRef.current
      //   const imgAspect = envMap.image.width / envMap.image.height  //第2步：计算出背景图宽高比

      //   const resultAspect = imgAspect / canvasAspect  //第3步：计算出最终背景图宽缩放宽高比

      //   //第4步：设置背景图纹理的偏移和重复
      //   envMap.offset.x = resultAspect > 1 ? (1 - 1 / resultAspect) / 2 : 0
      //   envMap.repeat.x = resultAspect > 1 ? 1 / resultAspect : 1

      //   envMap.offset.y = resultAspect > 1 ? 0 : (1 - resultAspect) / 2
      //   envMap.repeat.y = resultAspect > 1 ? 1 : resultAspect
      // }

  })  
})

onUnmounted(() => {
  orbitControls?.dispose()
  renderer?.dispose()
  scene?.clear()
})

function envMapResize(width, height) {
  console.log('envMapResize', envMap)
  // 解决背景图变形
  if (envMap) {
    const canvasAspect = width / height  //第1步：计算出画布宽高比
    // const bgTexture = textureRef.current
    const imgAspect = envMap.width / envMap.height  //第2步：计算出背景图宽高比
    const resultAspect = imgAspect / canvasAspect  //第3步：计算出最终背景图宽缩放宽高比

    //第4步：设置背景图纹理的偏移和重复
    envMap.offset.x = resultAspect > 1 ? (1 - 1 / resultAspect) / 2 : 0
    envMap.repeat.x = resultAspect > 1 ? 1 / resultAspect : 1
    envMap.offset.y = resultAspect > 1 ? 0 : (1 - resultAspect) / 2
    envMap.repeat.y = resultAspect > 1 ? 1 : resultAspect
   // TODO： 初始化时imgAspect是NaN
    console.log('imgAspect:', imgAspect, 'canvasAspect:', canvasAspect)
  }
}




function init() {
  const container = document.getElementById('canvasContainer')

  // 1、相机
  const aspect = container.clientWidth / container.clientHeight
  camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 2000)

  // const k = container.clientWidth / container.clientHeight
  // const s = 0.5; //控制left, right, top, bottom范围大小
  // camera = new THREE.OrthographicCamera(-s * k, s * k, s, -s, 1, 8000)
  
  // camera.position.set(0, 0, 0)
  camera.position.set(292, 133, -544)
  // camera.position.set(200, 133, -400)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()

  // 2、场景
  scene = new THREE.Scene()
  // envMap = loadTexture(sphereBack)
  // envMapResize(container.clientWidth, container.clientHeight)
  // scene.environment = envMap
  // scene.background = envMap

  // 3、渲染器，并将其渲染后的canvas元素添加到页面中  
  renderer = new THREE.WebGLRenderer({
    canvas: container.appendChild(document.createElement('canvas')), // 指定渲染器输出的canvas元素
    antialias: true, //开启抗锯齿
    // clearColor: 0xFFFFFF, //设置背景颜色
  })
  // renderer.setSize(800, 600)
  renderer.setSize(container.clientWidth, container.clientHeight)
  // 获取你屏幕对应的设备像素比.devicePixelRatio告诉threejs,以免渲染模糊问题
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setClearColor(0xFFFFFF, 1) //设置背景颜色和透明度
  // 创建渲染器时已指定了渲染器输出的canvas元素，就不需要再将renderer.domElement添加到页面中了
  // container.appendChild(renderer.domElement) 
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

  renderer.domElement.addEventListener('click', function (event) {
    // .offsetY、.offsetX以canvas画布左上角为坐标原点,单位px
    const px = event.offsetX
    const py = event.offsetY
    //屏幕坐标px、py转WebGL标准设备坐标x、y
    //width、height表示canvas画布宽高度
    const x = (px / container.clientWidth) * 2 - 1
    const y = -(py / container.clientHeight) * 2 + 1
    //创建一个射线投射器`Raycaster`
    raycaster = new THREE.Raycaster();
    //.setFromCamera()计算射线投射器`Raycaster`的射线属性.ray
    // 形象点说就是在点击位置创建一条射线，射线穿过的模型代表选中
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
    //.intersectObjects([mesh1, mesh2, mesh3])对参数中的网格模型对象进行射线交叉计算
    // 未选中对象返回空数组[],选中一个对象，数组1个元素，选中两个对象，数组两个元素
    const intersects = raycaster.intersectObjects(meshs)
    console.log("射线器返回的对象", intersects);
    // intersects.length大于0说明，说明选中了模型
    if (intersects.length > 0) {
        // 选中模型的第一个模型，设置为红色
        intersects[0].object.material.color.set(0xff0000)
        intersects.forEach(item => {
          console.log('item.object.name:', item.object.name, 'color', item.object.material.color)
          // if(item.object.name === 'monkey' || item.object.name === 'sprite') {
          if(item.object.name === 'monkey') {
            item.object.material.color.set(0xffff000)
            console.log('color 2', item.object.material.color)
          }
        })
    }
  })

  // 处理渲染后期
  // 创建后处理对象EffectComposer，WebGL渲染器作为参数
  // composer = new EffectComposer(renderer)
  // // 创建一个渲染器通道，场景和相机作为参数
  // const renderPass = new RenderPass(scene, camera)
  // // 设置renderPass通道
  // composer.addPass(renderPass)
  
  // OutlinePass可以给指定的某个模型对象添加一个高亮发光描边效果。
  // OutlinePass第一个参数v2的尺寸和canvas画布保持一致
  // const v2 = new THREE.Vector2(container.clientWidth, container.clientHeight)
  // outlinePass = new OutlinePass(v2, scene, camera)
  // outlinePass.visibleEdgeColor.set(0x1bd921)
  // //高亮发光描边厚度
  // outlinePass.edgeThickness = 4
  // //高亮描边发光强度
  // outlinePass.edgeStrength = 6
  // //模型闪烁频率控制，默认0不闪烁
  // outlinePass.pulsePeriod = 2
  // 设置OutlinePass通道
  // composer.addPass(outlinePass)
  
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
  
  // const pixelRatio = renderer.getPixelRatio();//获取设备像素比 
  // const FXAAPass = new ShaderPass( FXAAShader );
  // // `.getPixelRatio()`获取`renderer.setPixelRatio()`设置的值  
  // // width、height是canva画布的宽高度
  // FXAAPass.uniforms.resolution.value.x = 1 /(container.clientWidth * pixelRatio);
  // FXAAPass.uniforms.resolution.value.y = 1 /(container.clientHeight * pixelRatio);
  // composer.addPass( FXAAPass )

  // width、height是canva画布的宽高度
  // const smaaPass = new SMAAPass(container.clientWidth * pixelRatio, container.clientHeight * pixelRatio);
  // composer.addPass(smaaPass)

  // 放最后
  // const outputPass = new OutputPass()
  // composer.addPass( outputPass ) 
  // renderer.setAnimationLoop(animate) //设置渲染循环，参数是一个函数，在每一帧执行

  css2Renderer = css2DRender(container.clientWidth, container.clientHeight)

  // 添加辅助工具
  addHelpers()
  // 添加光源
  addPointLight()
  addDirectionalLight()
  addAmbientLight()
  // addSpotLight() 

  addObject()
  loadEnvMap()
  animate()
  
}

function loadEnvMap() {
  console.log('loadEnvMap:', container.clientWidth, container.clientHeight)
  envMap = loadTexture(sphereBack)
  envMapResize(container.clientWidth, container.clientHeight)
  scene.environment = envMap
  scene.background = envMap
}

function css2DRender(width, height) {
  // 创建一个CSS2渲染器CSS2DRenderer
  const css2Renderer = new CSS2DRenderer()
  css2Renderer.setSize(width, height)
  // HTML标签<div id="tag"></div>外面父元素叠加到canvas画布上且重合
  css2Renderer.domElement.style.position = 'absolute'
  css2Renderer.domElement.style.top = '0px'
  // css2Renderer.domElement.style.left = width / 2 + 'px'
  // css2Renderer.domElement.style.zIndex =  99999
  //设置.pointerEvents=none，解决HTML元素标签对threejs canvas画布鼠标事件的遮挡
  css2Renderer.domElement.style.pointerEvents = 'none'
  // document.body.appendChild(css2Renderer.domElement)

  container.appendChild(css2Renderer.domElement)
  return css2Renderer
}



// let i = 0; //在渲染循环中累加变化
// const timer = new THREE.Timer() // Clock废弃

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
  
  css2Renderer.render(scene, camera)
  // renderer.autoClear = false
  // renderer.clearDepth()
  // composer.render(scene, camera)

  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

/* 添加辅助工具 */
function addHelpers() {
  // 辅助坐标轴 
  addAxesHelper(300)
  addOrbitControls()
  // addMapControls()
  addGridHelper()
  
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
  orbitControls.maxPolarAngle = Math.PI/2
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
    console.log('camera.position',camera.position);
    console.log('controls.target',controls.target);
  })
}

// 光源辅助观察
function addPointLightHelper(pointLight) {
  const pointLightHelper = new THREE.PointLightHelper(pointLight, 10)
  scene.add(pointLightHelper) 
}

function addDirectionalLightHelper(directionalLight) {
  const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 10)  
  // 可视化平行光阴影对应的正投影相机对象
  const cameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
//   scene.add(cameraHelper);
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
function addDirectionalLight() {
  directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(100, 200, 100)
  directionalLight.castShadow = true
  addDirectionalLightHelper(directionalLight)
  scene.add(directionalLight)
}

// 3、环境光
function addAmbientLight() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
}

// 4、聚光灯
function addSpotLight() {
  const spotLight = new THREE.SpotLight(0xffffff, 1)
  spotLight.position.set(5, 10, 0)
  scene.add(spotLight)
}

// 在场景中添加物体
function addObject() {  
  loadChargeSationModels()
  // composer.addPass(outlinePass)
}

let tex

// 纹理加载
function loadTexture(url, loadManager) {
  // const loader = new THREE.TextureLoader()
  const loader = loadManager ? new THREE.TextureLoader(loadManager) : new THREE.TextureLoader()
  const tex = loader.load(url)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}


function loadCubeTexture(paths, callback, basePath) {
  const cubeLoader = new THREE.CubeTextureLoader()
  if(basePath) cubeLoader.setPath(basePath)
  cubeLoader.load(paths, (gltf) => {
    callback(gltf)
  })
}

const progress = ref()

// charge station
function loadChargeSationModels() {
  // const url = '/three/new_energy_vehicle_charging_station/scene.gltf'
  const url = '/three/new_energy_vehicle_charging_station.glb'
  const onProgress = (val) => {
    progress.value = val + '%'
  }

  loadModels(url, (gltf) => {
    console.log(gltf)
    // onsole.log(gltf.scene.)
    // gltf.scene.scale.set(0.9, 0.9, 0.9)
    // gltf.scene.scale.set(0.2, 0.2, 0.2)
    const model = gltf.scene
    model.position.set(0, 0, 0)
    // model.material.envMap = envMap

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

    model.traverse((child) => {

    })
    // gltf.scene.dispose()
    scene.add(model)    
  
  }, onProgress)
 
}


// gltf要放到public文件夹里
// 纹理文件需与模型文件在同一目录或正确指定路径
function loadModels(url, callback, onProgress) {
  const loader = new GLTFLoader()
  // const dracoLoader = new DRACOLoader()
  // dracoLoader.setDecoderPath( 'three/examples/jsm/libs/draco/' )
  // loader.setDRACOLoader( dracoLoader )
  loader.load(url, (gltf) => {
    callback(gltf)
  }, (progerss) => {
    // console.log(`GLTF加载进度：${(progerss.loaded / progerss.total) * 100}%`)
    const progress = Math.floor(progerss.loaded / progerss.total * 100)
    onProgress(progress)
  }, (error) => {
    console.log(`GLTF加载错误：${error}`)
  })
}


</script>

<template>

    <div id="canvasContainer" class="min-h-screen"></div>

</template>

<style scoped>
.container {
  width: 100%;
  height: 600px;
  /* border: 1px solid red; */
  overflow: hidden;
}
#tag {
  padding: 0px 10px;
  border: #00ffff solid 1px;
  height: 40px;
  border-radius: 5px;
  width: 65px;
}
</style>
