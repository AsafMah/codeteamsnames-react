import {useState} from 'react'
import html2canvas from 'html2canvas'

/**
 * @module Main_Hook
 * Hook return
 * @typedef {Array} HookReturn
 * @property {string} HookReturn[0] - image string
 * @property {string} HookReturn[1] - take screen shot string
 * @property {object} HookReturn[2] - errors
 */

interface Screenshot {
    base64: string;
    blob: Blob;
}

function toBlob(canvas: HTMLCanvasElement, type?: string, quality?: string) {
    return new Promise<Blob>(((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(blob), type, quality)));
}

/**
 * hook for creating screenshot from html node
 * @returns {HookReturn}
 */
const useScreenshot: () => [Screenshot | null, (node: HTMLElement | null) => Promise<Screenshot>] = () => {
    const [image, setImage] = useState<Screenshot | null>(null)
    /**
     * convert html node to image
     * @param {HTMLElement} node
     */
    const takeScreenShot = async (node: HTMLElement | null) => {
        if (!node) {
            throw new Error('You should provide correct html node.')
        }
        const canvas = await html2canvas(node);
        const croppedCanvas = document.createElement('canvas')
        const croppedCanvasContext = croppedCanvas.getContext('2d')
        if (!croppedCanvasContext) {
            throw new Error('Canvas is null')
        }

        // init data
        const cropPositionTop = 0
        const cropPositionLeft = 0
        const cropWidth = canvas.width
        const cropHeight = canvas.height

        croppedCanvas.width = cropWidth
        croppedCanvas.height = cropHeight

        croppedCanvasContext.drawImage(
            canvas,
            cropPositionLeft,
            cropPositionTop,
        );

        let image = {
            base64: croppedCanvas.toDataURL(),
            blob: await toBlob(croppedCanvas)
        };
        setImage(image);
        return image;
    }

    return [image, takeScreenShot]
}

/**
 * creates name of file
 * @param {string} extension
 * @param  {string[]} names parts of file name
 */
const createFileName = (extension = '', ...names: string[]) => {
    if (!extension) {
        return ''
    }

    return `${names.join('')}.${extension}`
}

export {useScreenshot, createFileName}