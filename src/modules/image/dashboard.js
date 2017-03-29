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
        reset() {
            this.upload.status = 'ready'
        },
        insertImageUrl() {
            if (!this.imageUrl) {
                return
            }
            this.$parent.execCommand(Command.INSERT_IMAGE, this.imageUrl)
            this.imageUrl = null
        },
        pick() {
            this.$refs.file.click()
        },
        setUploadError(msg) {
            this.upload.status = 'error'
            this.upload.errorMsg = msg
        },
        startUpload() {
            const component = this
            const config = this.$options.module.config

            const file = this.$refs.file.files[0]

            if (file.size > config.sizeLimit) {
                this.setUploadError(this.$parent.locale['exceed size limit'])
                return
            }
            this.$refs.file.value = null

            // 需要压缩
            if (config.compress) {
                lrz(file, {
                    width: config.width,
                    height: config.height,
                    quality: config.quality,
                    fieldName: config.fieldName
                }).then((rst) => {
                    if (config.server) {
                        component.uploadToServer(rst.file)
                    } else {
                        component.insertBase64(rst.base64)
                    }
                }).catch((err) => {
                    this.setUploadError(err.toString())
                })
                return
            }
            // 不需要压缩
            // base64
            if (!config.server) {
                const reader = new FileReader()
                reader.onload = (e) => {
                    component.insertBase64(e.target.result)
                }
                reader.readAsDataURL(file)
                return
            }
            // 上传服务器
            component.uploadToServer(file)

        },
        insertBase64(data) {
            this.$parent.execCommand(Command.INSERT_IMAGE, data)
        },
        awsSignature(file) {
            console.log(file);
            const config = this.$options.module.config
            return new Promise(function(resolve, reject) {
                const xhr = new XMLHttpRequest()

                xhr.onload = () => {
                    console.log(xhr.responseText);
                    resolve(xhr.responseText)
                }

                xhr.open('GET', config.awsSignatureUrl + '&filename=' + file.name)

                var headers = config.headers;

                headers.forEach(function(header) {
                    var headerName = Object.keys(header);
                    var headerValue = header[headerName];
                    xhr.setRequestHeader(headerName, headerValue);
                });

                xhr.send()
            });

        },
        uploadToServer(file) {
            const component = this

            component.awsSignature(file).then(function(signature) {
                signature = JSON.parse(signature)
                console.log(signature);
                const config = component.$options.module.config
                const formData = new FormData()

                formData.append('key', file.name)
                formData.append('acl', signature.params.acl)
                formData.append('success_action_status', '201')
                formData.append('policy', signature.params.policy)
                formData.append('x-amz-credential', signature.params['x-amz-credential'])                
                formData.append('x-amz-algorithm', signature.params['x-amz-algorithm'])                
                formData.append('x-amz-date', signature.params['x-amz-date'])                
                formData.append('x-amz-signature', signature.params['x-amz-signature'])
                formData.append('file', file)

              
                const xhr = new XMLHttpRequest()

                xhr.upload.onprogress = (e) => {
                    console.log(e);
                    component.upload.status = 'progress'
                    if (e.lengthComputable) {
                        component.upload.progressComputable = true
                        const percentComplete = e.loaded / e.total
                        component.upload.complete = (percentComplete * 100).toFixed(2)
                    } else {
                        component.upload.progressComputable = false
                    }
                }

                xhr.onload = () => {       

                    if (xhr.status != 201) {
                        component.setUploadError(`request error,code ${xhr.status}`)
                        return
                    }
                    try {
                        const url = config.uploadHandler(xhr.responseText)
                        if (url) {
                            component.$parent.execCommand(Command.INSERT_IMAGE, url)
                        }
                    } catch (err) {
                        component.setUploadError(err.toString())
                    } finally {
                        component.upload.status = 'ready'
                    }
                }

                xhr.onerror = () => {
                    // find network info in brower tools
                    component.setUploadError('request error')
                }

                xhr.onabort = () => {
                    component.upload.status = 'abort'
                }

                xhr.open('POST', config.server)
           

                xhr.send(formData)
            })

        }
    }
}
