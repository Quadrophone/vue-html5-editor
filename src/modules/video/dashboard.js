import lrz from 'lrz'
import template from './dashboard.html'
import Command from '../../range/command'

/**
 * Created by peak on 2017/2/10.
 */
export default {
    template,
    data() {
        return {
            imageUrl: '',
            upload: {
                status: 'ready', // progress,success,error,abort
                errorMsg: null,
                progressComputable: false,
                complete: 0
            }
        }
    },
    methods: {
        reset(){
            this.upload.status = 'ready'
        },
        pick() {
            this.$refs.file.click()
        },
        setUploadError(msg){
            this.upload.status = 'error'
            this.upload.errorMsg = msg
        },
        startUpload() {
            const component = this
            const config = this.$options.module.config
            console.log(config);
            const file = this.$refs.file.files[0]
            if (file.size > config.sizeLimit) {
                this.setUploadError(this.$parent.locale['exceed size limit'])
                return
            }
            this.$refs.file.value = null

            // 上传服务器
            component.uploadToServer(file)
        },
        uploadToServer(file) {
            const config = this.$options.module.config
            const formData = new FormData()
            formData.append(config.fieldName, file)

            const xhr = new XMLHttpRequest()
            console.log('UPLOADING');
            xhr.onprogress = (e) => {
                console.log(e);
                this.upload.status = 'progress'
                if (e.lengthComputable) {
                    this.upload.progressComputable = true
                    const percentComplete = e.loaded / e.total
                    this.upload.complete = (percentComplete * 100).toFixed(2)
                } else {
                    this.upload.progressComputable = false
                }
            }

            xhr.onload = () => {
                if (xhr.status !== 200) {
                    this.setUploadError(`request error,code ${xhr.status}`)
                    return
                }

                try {
                    const url = config.uploadHandler(xhr.responseText)
                    if (url) {
                        var video = '<video controls>';
                        video += '<source src="' + url + '" type="video/' + url.split('.').pop() + '">';
                        video += '</video>'; 
                        this.$parent.execCommand(Command.INSERT_VIDEO, video)
                    }
                } catch (err) {
                    this.setUploadError(err.toString())
                } finally {
                    this.upload.status = 'ready'
                }
            }

            xhr.onerror = () => {
                // find network info in brower tools
                this.setUploadError('request error')
            }

            xhr.onabort = () => {
                this.upload.status = 'abort'
            }

            xhr.open('POST', config.server)
          
            var headers = config.headers;

            headers.forEach(function(header) {
                var headerName = Object.keys(header); 
                var headerValue = header[headerName];
                xhr.setRequestHeader(headerName, headerValue);                     
            });

            xhr.send(formData)
        }
    }
}