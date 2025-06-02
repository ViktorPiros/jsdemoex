import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import connectDB from './db';

async function getPartners() {
  try {
    const response = await global.dbclient.query(`SELECT T1.*,
    CASE 
    WHEN SUM(T2.product_amount) > 300000 THEN 15
    WHEN SUM(T2.product_amount) > 50000 THEN 10
    WHEN SUM(T2.product_amount) > 10000 THEN 5
    ELSE 0 
    END as discount
    FROM partners AS T1
    LEFT JOIN partner_products AS T2 ON T1.id = T2.id_partner
    GROUP BY T1.id`)
    return response.rows
  } catch (e) {
    console.log(e)
  }
}
async function createPartner(event, partner) {
  const { type, name, ceo, email, phone, address, rating } = partner;

  try {
    await global.dbclient.query(`INSERT into partners (id_partner_type, partner_name, director_name, partner_email, partner_phone, partner_address, rating) values('${type}', '${name}', '${ceo}', '${email}', '${phone}', '${address}', ${rating})`)
    dialog.showMessageBox({ message: 'Успех! Партнер создан' })
  } catch (e) {
    console.log(e)
    dialog.showErrorBox('Ошибка', "Партнер с таким именем уже есть")
  }
}
async function updatePartner(event, partner) {
  const { id, id_partner_type, partner_name, director_name, partner_email, partner_phone, partner_address, rating } = partner;

  try {
    await global.dbclient.query(`UPDATE partners
      SET name = '${partner_name}', organization_type = '${id_partner_type}', ceo='${director_name}', email='${partner_email}', phone='${partner_phone}', address='${partner_address}', rating='${rating}'
      WHERE partners.id = ${id};`)
    dialog.showMessageBox({ message: 'Успех! Данные обновлены' })
    return;
  } catch (e) {
    dialog.showErrorBox('Невозможно создать пользователя', 'Такой пользователь уже есть')
    return ('error')
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    icon: join(__dirname, '../../resources/icon.ico'),
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  global.dbclient = await connectDB();

  ipcMain.handle('getPartners', getPartners)
  ipcMain.handle('createPartner', createPartner)
  ipcMain.handle('updatePartner', updatePartner)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})