import dashboard from './dashboard'

/**
 * insert image
 * Created by peak on 16/8/18.
 */
export default {
    name: 'video',
    icon: 'fa fa-file-video-o',
    i18n: 'video',
    config: {
        server: null,
        fieldName: 'video',
        sizeLimit: 15728640,// 15MB
        headers: [],
        uploadHandler(responseText){
            const json = JSON.parse(responseText)
            return json.ok ? json.data : null
        }
    },
    dashboard
}
